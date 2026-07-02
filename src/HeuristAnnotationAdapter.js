function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function buildAnnotationPageUrl(annotationServerUrl, canvasId) {
  const base = trimTrailingSlash(annotationServerUrl);
  const url = new URL(`${base}/pages`, window.location.origin);

  url.searchParams.set('uri', canvasId);

  return url.toString();
}

function normaliseAnnotationPage(data, fallbackPageId) {
  if (!data) {
    return null;
  }

  if (data.type === 'AnnotationPage' && Array.isArray(data.items)) {
    return data;
  }

  if (Array.isArray(data)) {
    return {
      id: fallbackPageId,
      type: 'AnnotationPage',
      items: data
    };
  }

  if (Array.isArray(data.items)) {
    return {
      id: data.id || fallbackPageId,
      type: data.type || 'AnnotationPage',
      items: data.items
    };
  }

  if (Array.isArray(data.resources)) {
    return {
      id: data.id || fallbackPageId,
      type: 'AnnotationPage',
      items: data.resources
    };
  }

  if (Array.isArray(data.annotations)) {
    return {
      id: data.id || fallbackPageId,
      type: 'AnnotationPage',
      items: data.annotations
    };
  }

  return {
    id: data.id || fallbackPageId,
    type: 'AnnotationPage',
    items: []
  };
}

function convertRelativeHeuristUrlToCanonical(value, canonicalBaseUrl) {
  if (!value || typeof value !== 'string' || !canonicalBaseUrl) {
    return value;
  }

  if (value.startsWith('/heurist/')) {
    return `${trimTrailingSlash(canonicalBaseUrl)}${value}`;
  }

  return value;
}

function replaceCanvasIdInString(value, fromCanvasId, toCanvasId) {
  if (
    typeof value !== 'string' ||
    !fromCanvasId ||
    !toCanvasId ||
    fromCanvasId === toCanvasId
  ) {
    return value;
  }

  // Exact canvas id.
  if (value === fromCanvasId) {
    return toCanvasId;
  }

  // Canvas id with fragment selector, for example:
  // http://.../canvas/abc#xywh=...
  if (value.startsWith(`${fromCanvasId}#`)) {
    return `${toCanvasId}${value.substring(fromCanvasId.length)}`;
  }

  // Canvas id with query or other suffix, less common but safe.
  if (value.startsWith(`${fromCanvasId}?`)) {
    return `${toCanvasId}${value.substring(fromCanvasId.length)}`;
  }

  return value;
}

function replaceCanvasIdDeep(value, fromCanvasId, toCanvasId) {
  if (!fromCanvasId || !toCanvasId) {
    return value;
  }

  if (typeof value === 'string') {
    return replaceCanvasIdInString(value, fromCanvasId, toCanvasId);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceCanvasIdDeep(item, fromCanvasId, toCanvasId));
  }

  if (value && typeof value === 'object') {
    const result = {};

    Object.entries(value).forEach(([key, item]) => {
      result[key] = replaceCanvasIdDeep(item, fromCanvasId, toCanvasId);
    });

    return result;
  }

  return value;
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
    this.lookupCanvasId = convertRelativeHeuristUrlToCanonical(
      this.canvasId,
      this.heuristCanonicalBaseUrl
    );

    this.manifestRecId = options.manifestRecId || null;
    this.canvasRecId = options.canvasRecId || null;
    this.userLabel = options.userLabel || 'Heurist user';
    this.readonly = !!options.readonly;

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

  normalisePageForMirador(page) {
    if (!page || !Array.isArray(page.items)) {
      return page;
    }

    // Heurist returns annotations targeting canonical canvas URI.
    // In Vite dev, Mirador may know the same canvas as /heurist/api/...
    // Rewrite canonical target values to the current display canvas id.
    if (!this.lookupCanvasId || !this.canvasId || this.lookupCanvasId === this.canvasId) {
      return page;
    }

    const rewrittenItems = page.items.map((annotation) =>
      replaceCanvasIdDeep(annotation, this.lookupCanvasId, this.canvasId)
    );

    console.log('[HeuristAnnotationAdapter] target rewrite sample', {
      lookupCanvasId: this.lookupCanvasId,
      canvasId: this.canvasId,
      before: page.items[0],
      after: rewrittenItems[0]
    });

    return {
      ...page,
      items: rewrittenItems
    };
  }

  normaliseAnnotationForHeurist(annotation) {
    if (!annotation) {
      return annotation;
    }

    // Before save/update, convert the current display canvas id back
    // to the canonical Heurist canvas URI.
    if (!this.lookupCanvasId || !this.canvasId || this.lookupCanvasId === this.canvasId) {
      return annotation;
    }

    return replaceStringDeep(annotation, this.canvasId, this.lookupCanvasId);
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
    const page = normaliseAnnotationPage(data, url);
    const miradorPage = this.normalisePageForMirador(page);

    console.log('[HeuristAnnotationAdapter] annotation page', {
      raw: page,
      mirador: miradorPage
    });

    return miradorPage;
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

    const heuristAnnotation = this.normaliseAnnotationForHeurist(annotation);

    console.log('[HeuristAnnotationAdapter] create normalised for Heurist', heuristAnnotation);

    throw new Error('HeuristAnnotationAdapter.create is not implemented yet');
  }

  async update(annotation) {
    console.log('[HeuristAnnotationAdapter] update', annotation);

    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

    const heuristAnnotation = this.normaliseAnnotationForHeurist(annotation);

    console.log('[HeuristAnnotationAdapter] update normalised for Heurist', heuristAnnotation);

    throw new Error('HeuristAnnotationAdapter.update is not implemented yet');
  }

  async delete(annotationId) {
    console.log('[HeuristAnnotationAdapter] delete', annotationId);

    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

    throw new Error('HeuristAnnotationAdapter.delete is not implemented yet');
  }
}