export class LocalStorageAnnotationAdapter {
  constructor(options = {}) {
    this.canvasId = options.canvasId || 'unknown-canvas';
    this.userLabel = options.userLabel || 'Anonymous User';

    // In MAE this is really the AnnotationPage id/storage id.
    this.annotationPageId =
      options.annotationPageId ||
      `heurist-mirador4-annotation-page:${this.canvasId}`;

    console.log('[LocalStorageAnnotationAdapter] created', {
      canvasId: this.canvasId,
      annotationPageId: this.annotationPageId,
      userLabel: this.userLabel
    });
  }

  getStorageAdapterUser() {
    console.log('[LocalStorageAnnotationAdapter] getStorageAdapterUser');
    return this.userLabel;
  }

  _emptyAnnotationPage() {
    return {
      id: this.annotationPageId,
      type: 'AnnotationPage',
      items: []
    };
  }

  _readPage() {
    try {
      const raw = window.localStorage.getItem(this.annotationPageId);

      if (!raw) {
        console.log('[LocalStorageAnnotationAdapter] _readPage empty');
        return null;
      }

      const parsed = JSON.parse(raw);

      // Backward compatibility with our earlier temporary array format.
      if (Array.isArray(parsed)) {
        return {
          id: this.annotationPageId,
          type: 'AnnotationPage',
          items: parsed
        };
      }

      if (!parsed.items || !Array.isArray(parsed.items)) {
        return {
          ...parsed,
          type: parsed.type || 'AnnotationPage',
          items: []
        };
      }

      return parsed;
    } catch (error) {
      console.warn('[LocalStorageAnnotationAdapter] failed to read localStorage', error);
      return null;
    }
  }

  _writePage(annotationPage) {
    const page = {
      id: annotationPage.id || this.annotationPageId,
      type: annotationPage.type || 'AnnotationPage',
      items: Array.isArray(annotationPage.items) ? annotationPage.items : []
    };

    console.log('[LocalStorageAnnotationAdapter] _writePage', page);
    window.localStorage.setItem(this.annotationPageId, JSON.stringify(page));

    return page;
  }

  async all() {
    const page = this._readPage();

    console.log('[LocalStorageAnnotationAdapter] all', page);

    return page;
  }

  async get(annotationId) {
    const page = this._readPage();

    if (!page) {
      return null;
    }

    return page.items.find((item) => item.id === annotationId) || null;
  }

  async create(annotation) {
    console.log('[LocalStorageAnnotationAdapter] create', annotation);

    const page = this._readPage() || this._emptyAnnotationPage();

    page.items.push(annotation);

    return this._writePage(page);
  }

  async update(annotation) {
    console.log('[LocalStorageAnnotationAdapter] update', annotation);

    const page = this._readPage() || this._emptyAnnotationPage();

    const index = page.items.findIndex((item) => item.id === annotation.id);

    if (index >= 0) {
      page.items.splice(index, 1, annotation);
    } else {
      page.items.push(annotation);
    }

    return this._writePage(page);
  }

  async delete(annotationId) {
    console.log('[LocalStorageAnnotationAdapter] delete', annotationId);

    const page = this._readPage() || this._emptyAnnotationPage();

    page.items = page.items.filter((item) => item.id !== annotationId);

    return this._writePage(page);
  }
}