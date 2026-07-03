/**
 * @file LocalStorageAnnotationAdapter.js
 * @brief MAE storage adapter using browser localStorage.
 * @fileOverview Provides a development and fallback annotation adapter for mirador-annotation-editor. It stores one AnnotationPage per canvas in localStorage and implements the same storage methods used by the Heurist-backed adapter.
 *
 * @project     Mirador v4 integration/bundle for Heurist with MAE annotation support.
 *
 * @link https://HeuristNetwork.org
 * @copyright (C) 2024 onwards Heurist Network
 * @license https://www.gnu.org/licenses/gpl-3.0.txt GNU License 3.0
 * @author Artem Osmakov <osmakov@gmail.com>
 *
 *
 */
/**
 * LocalStorage-backed adapter for mirador-annotation-editor.
 *
 * This adapter is useful for local development and isolated MAE testing because
 * it requires no Heurist API.
 */
export class LocalStorageAnnotationAdapter {
  /**
   * Create a localStorage annotation adapter.
   *
   * @param {Object} options Adapter options.
   */
  constructor(options = {}) {
    this.canvasId = options.canvasId || 'unknown-canvas';
    this.userLabel = options.userLabel || 'Anonymous User';

    // In MAE this is really the AnnotationPage id/storage id.
    this.annotationPageId =
      options.annotationPageId ||
      `heurist-mirador4-annotation-page:${this.canvasId}`;

      canvasId: this.canvasId,
      annotationPageId: this.annotationPageId,
      userLabel: this.userLabel
    });
  }

  /**
   * Return the MAE user label.
   *
   * @returns {string} User label.
   */
  getStorageAdapterUser() {
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
      return null;
    }
  }

  _writePage(annotationPage) {
    const page = {
      id: annotationPage.id || this.annotationPageId,
      type: annotationPage.type || 'AnnotationPage',
      items: Array.isArray(annotationPage.items) ? annotationPage.items : []
    };

    window.localStorage.setItem(this.annotationPageId, JSON.stringify(page));

    return page;
  }

  /**
   * Load the current canvas AnnotationPage.
   *
   * @returns {Promise<Object|null>} Stored AnnotationPage or null.
   */
  async all() {
    const page = this._readPage();


    return page;
  }

  /**
   * Get one annotation by id.
   *
   * @param {string} annotationId Annotation id.
   * @returns {Promise<Object|null>} Matching annotation or null.
   */
  async get(annotationId) {
    const page = this._readPage();

    if (!page) {
      return null;
    }

    return page.items.find((item) => item.id === annotationId) || null;
  }

  /**
   * Create a new annotation in localStorage.
   *
   * @param {Object} annotation MAE annotation.
   * @returns {Promise<Object>} Updated AnnotationPage.
   */
  async create(annotation) {

    const page = this._readPage() || this._emptyAnnotationPage();

    page.items.push(annotation);

    return this._writePage(page);
  }

  /**
   * Update an existing annotation in localStorage.
   *
   * @param {Object} annotation MAE annotation.
   * @returns {Promise<Object>} Updated AnnotationPage.
   */
  async update(annotation) {

    const page = this._readPage() || this._emptyAnnotationPage();

    const index = page.items.findIndex((item) => item.id === annotation.id);

    if (index >= 0) {
      page.items.splice(index, 1, annotation);
    } else {
      page.items.push(annotation);
    }

    return this._writePage(page);
  }

  /**
   * Delete one annotation from localStorage.
   *
   * @param {string} annotationId Annotation id.
   * @returns {Promise<Object>} Updated AnnotationPage.
   */
  async delete(annotationId) {

    const page = this._readPage() || this._emptyAnnotationPage();

    page.items = page.items.filter((item) => item.id !== annotationId);

    return this._writePage(page);
  }
}