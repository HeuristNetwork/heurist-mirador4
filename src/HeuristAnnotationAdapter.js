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

export class HeuristAnnotationAdapter {
  constructor(options = {}) {
    this.annotationServerUrl = options.endpointUrl || options.annotationServerUrl || null;
    this.db = options.db || null;
    this.canvasId = options.canvasId || null;
    this.manifestRecId = options.manifestRecId || null;
    this.canvasRecId = options.canvasRecId || null;
    this.userLabel = options.userLabel || 'Heurist user';
    this.readonly = !!options.readonly;

    this.annotationPageId = this.annotationServerUrl && this.canvasId
      ? buildAnnotationPageUrl(this.annotationServerUrl, this.canvasId)
      : `heurist-annotation-page:${this.canvasId || 'unknown-canvas'}`;

    console.log('[HeuristAnnotationAdapter] created', {
      annotationServerUrl: this.annotationServerUrl,
      db: this.db,
      canvasId: this.canvasId,
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

    if (!this.annotationServerUrl || !this.canvasId) {
      console.warn('[HeuristAnnotationAdapter] missing annotationServerUrl or canvasId');
      return null;
    }

    const url = buildAnnotationPageUrl(this.annotationServerUrl, this.canvasId);

    console.log('[HeuristAnnotationAdapter] fetch annotation page', url);

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

    console.log('[HeuristAnnotationAdapter] annotation page', page);

    return page;
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

    throw new Error('HeuristAnnotationAdapter.create is not implemented yet');
  }

  async update(annotation) {
    console.log('[HeuristAnnotationAdapter] update', annotation);

    if (this.readonly) {
      throw new Error('HeuristAnnotationAdapter is readonly');
    }

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