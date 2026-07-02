import { HeuristMaeAnnotationMapper } from './HeuristMaeAnnotationMapper.js';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildAnnotationPageUrl(annotationServerUrl, canvasId) {
  const base = trimTrailingSlash(annotationServerUrl);
  const url = new URL(`${base}/pages`, window.location.origin);

  url.searchParams.set('uri', canvasId);

  return url.toString();
}

function buildAnnotationUrl(annotationServerUrl, annotationId = null) {
  const base = trimTrailingSlash(annotationServerUrl);

  if (!annotationId) {
    return new URL(base, window.location.origin).toString();
  }

  return new URL(`${base}/${encodeURIComponent(annotationId)}`, window.location.origin).toString();
}

function getAnnotationId(annotationOrId) {
  if (typeof annotationOrId === 'string') {
    return annotationOrId;
  }

  return annotationOrId?.id || null;
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('[HeuristAnnotationAdapter] non-JSON response', text);
    return null;
  }
}

function assertWriteOk(response, data, action) {
  if (!response.ok) {
    throw new Error(
      `Heurist annotation ${action} failed: HTTP ${response.status} ${response.statusText}`
    );
  }

  if (data && data.status && data.status !== 'ok' && data.status !== 'OK') {
    throw new Error(
      `Heurist annotation ${action} failed: ${data.message || data.status}`
    );
  }
}

export class HeuristAnnotationAdapter {
  constructor(options = {}) {
    this.annotationServerUrl = options.annotationServerUrl || options.endpointUrl || null;
    this.db = options.db || null;

    // Canvas id as MAE/Mirador knows it in this viewer.
    this.canvasId = options.canvasId || null;

    // Vite-dev canonical base URL for Heurist, for example http://127.0.0.1.
    this.heuristCanonicalBaseUrl = options.heuristCanonicalBaseUrl || null;

    // Canvas id used to query Heurist annotation endpoint.
    this.lookupCanvasId = HeuristMaeAnnotationMapper.canonicalCanvasId(
      this.canvasId,
      this.heuristCanonicalBaseUrl
    );

    this.manifestRecId = options.manifestRecId || null;
    this.canvasRecId = options.canvasRecId || null;
    this.userLabel = options.userLabel || 'Heurist user';
    this.readonly = !!options.readonly;

    this.mapper = new HeuristMaeAnnotationMapper({
      canvasId: this.canvasId,
      lookupCanvasId: this.lookupCanvasId,
      userLabel: this.userLabel
    });

    this.annotationPageId = this.annotationServerUrl && this.lookupCanvasId
      ? buildAnnotationPageUrl(this.annotationServerUrl, this.lookupCanvasId)
      : `heurist-annotation-page:${this.lookupCanvasId || this.canvasId || 'unknown-canvas'}`;

    console.log('[HeuristAnnotationAdapter] created', {
      annotationServerUrl: this.annotationServerUrl,
      db: this.db,
      canvasId: this.canvasId,
      lookupCanvasId: this.lookupCanvasId,
      manifestRecId: this.manifestRecId,
      canvasRecId: this.canvasRecId,
      annotationPageId: this.annotationPageId,
      readonly: this.readonly
    });
  }

  getStorageAdapterUser() {
    return this.userLabel || 'Heurist user';
  }

  async all() {
    console.log('[HeuristAnnotationAdapter] all');

    if (!this.annotationServerUrl || !this.lookupCanvasId) {
      console.warn('[HeuristAnnotationAdapter] missing annotationServerUrl or lookupCanvasId');
      return null;
    }

    const url = buildAnnotationPageUrl(this.annotationServerUrl, this.lookupCanvasId);

    console.log('[HeuristAnnotationAdapter] fetch annotation page', {
      url,
      canvasId: this.canvasId,
      lookupCanvasId: this.lookupCanvasId
    });

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/ld+json, application/json'
      }
    });

    if (!response.ok) {
      console.warn('[HeuristAnnotationAdapter] annotation page fetch failed', {
        status: response.status,
        statusText: response.statusText,
        url
      });

      return null;
    }

    const data = await response.json();
    const page = this.mapper.normalizePage(data, url);
    const maePage = this.mapper.pageToMAE(page);

    console.log('[HeuristAnnotationAdapter] annotation page', {
      raw: page,
      mae: maePage
    });

    return maePage;
  }

  async get(annotationId) {
    const page = await this.all();

    if (!page || !Array.isArray(page.items)) {
      return null;
    }

    return page.items.find((item) => item.id === annotationId) || null;
  }

  async create(annotation) {
    console.log('[HeuristAnnotationAdapter] create', annotation);

    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

    if (!this.annotationServerUrl) {
      throw new Error('Missing annotationServerUrl');
    }

    //console.log('[HeuristAnnotationAdapter] POST', annotation);
    //return;

    const heuristAnnotation = {
      ...this.mapper.toWebAnnotation(annotation),
      source: 'mirador'
    };

    if (this.manifestRecId) {
      heuristAnnotation.manifestRecID = this.manifestRecId;
    }

    const url = buildAnnotationUrl(this.annotationServerUrl);

    console.log('[HeuristAnnotationAdapter] POST', {
      url,
      heuristAnnotation
    });

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json, application/ld+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(heuristAnnotation)
    });

    const data = await parseJsonResponse(response);

    console.log('[HeuristAnnotationAdapter] create response', data);

    assertWriteOk(response, data, 'create');

    // MAE expects an AnnotationPage, not the saved record id.
    return this.all();
  }

  async update(annotation) {
    console.log('[HeuristAnnotationAdapter] update', annotation);
    //return;
    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

    if (!this.annotationServerUrl) {
      throw new Error('Missing annotationServerUrl');
    }

    const annotationId = getAnnotationId(annotation);

    if (!annotationId) {
      throw new Error('Cannot update annotation without id');
    }

    const heuristAnnotation = {
      ...this.mapper.toWebAnnotation(annotation),
      source: 'mirador'
    };

    if (this.manifestRecId) {
      heuristAnnotation.manifestRecID = this.manifestRecId;
    }

    const url = buildAnnotationUrl(this.annotationServerUrl, annotationId);

    console.log('[HeuristAnnotationAdapter] PUT', {
      url,
      annotationId,
      heuristAnnotation
    });

    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        Accept: 'application/json, application/ld+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(heuristAnnotation)
    });

    const data = await parseJsonResponse(response);

    console.log('[HeuristAnnotationAdapter] update response', data);

    assertWriteOk(response, data, 'update');

    // MAE expects an AnnotationPage.
    return this.all();
  }

  async delete(annotationOrId) {
    console.log('[HeuristAnnotationAdapter] delete', annotationOrId);

    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

    if (!this.annotationServerUrl) {
      throw new Error('Missing annotationServerUrl');
    }

    const annotationId = getAnnotationId(annotationOrId);

    if (!annotationId) {
      throw new Error('Cannot delete annotation without id');
    }

    const url = buildAnnotationUrl(this.annotationServerUrl, annotationId);

    console.log('[HeuristAnnotationAdapter] DELETE', {
      url,
      annotationId
    });

    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });

    const data = await parseJsonResponse(response);

    console.log('[HeuristAnnotationAdapter] delete response', data);

    assertWriteOk(response, data, 'delete');

    // MAE expects an AnnotationPage.
    return this.all();
  }
}
