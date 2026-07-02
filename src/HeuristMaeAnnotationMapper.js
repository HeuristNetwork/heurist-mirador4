function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function htmlToPlainText(value) {
  if (!value) {
    return '';
  }

  if (typeof document === 'undefined') {
    return String(value).replace(/<[^>]*>/g, '').trim();
  }

  const div = document.createElement('div');
  div.innerHTML = String(value);
  return (div.textContent || div.innerText || '').trim();
}

function plainTextToHtml(value) {
  const text = value || '';

  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  return `<p>${text}</p>`;
}

function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstTextBody(annotation) {
  const bodies = asArray(annotation?.body);

  return (
    bodies.find((body) => body?.purpose === 'describing') ||
    bodies.find((body) => body?.type === 'TextualBody' && body?.purpose !== 'tagging') ||
    annotation?.maeData?.textBody ||
    null
  );
}

function tagBodies(annotation) {
  return asArray(annotation?.body).filter((body) => body?.purpose === 'tagging');
}

function normalizeCreatorForMae(creator, userLabel) {
  if (!creator) {
    return userLabel || 'Heurist user';
  }

  if (typeof creator === 'string') {
    return creator;
  }

  if (creator.name) {
    return creator.name;
  }

  return userLabel || 'Heurist user';
}

function sanitizeIdentifier(value) {
  return String(value || 'annotation')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'annotation';
}

function stableShapeId(annotation, suffix = 'shape') {
  return `${suffix}-${sanitizeIdentifier(annotation?.id || annotation?.target || 'annotation')}`;
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

  if (value === fromCanvasId) {
    return toCanvasId;
  }

  // Canvas id with fragment selector:
  // <canvasId>#xywh=...
  if (value.startsWith(`${fromCanvasId}#`)) {
    return `${toCanvasId}${value.substring(fromCanvasId.length)}`;
  }

  // Canvas id with query:
  // <canvasId>?...
  if (value.startsWith(`${fromCanvasId}?`)) {
    return `${toCanvasId}${value.substring(fromCanvasId.length)}`;
  }

  // MAE-generated annotation ids:
  // <canvasId>/annotation/{uuid}
  if (value.startsWith(`${fromCanvasId}/`)) {
    return `${toCanvasId}${value.substring(fromCanvasId.length)}`;
  }

  return value;
}

function replaceCanvasIdDeep(value, fromCanvasId, toCanvasId) {
  if (!fromCanvasId || !toCanvasId || fromCanvasId === toCanvasId) {
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

function normalizeAnnotationPage(data, fallbackPageId) {
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

function parseXywhTarget(target) {
  if (typeof target !== 'string') {
    return null;
  }

  const match = target.match(/#xywh=([^#]+)$/);
  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((value) => Number(value));

  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3]
  };
}

function selectorArray(target) {
  if (!target || typeof target !== 'object') {
    return [];
  }

  return asArray(target.selector);
}

function svgSelectorValue(target) {
  const selector = selectorArray(target).find((item) => item?.type === 'SvgSelector');
  return selector?.value || null;
}

function fragmentSelectorValue(target) {
  const selector = selectorArray(target).find((item) => item?.type === 'FragmentSelector');
  return selector?.value || null;
}

function targetSource(target) {
  if (!target || typeof target !== 'object') {
    return null;
  }

  return target.source || null;
}

function buildRectangleSvg(shape, fullCanvaXYWH = null) {
  let svgWidth = Math.ceil(shape.x + shape.width);
  let svgHeight = Math.ceil(shape.y + shape.height);

  if (typeof fullCanvaXYWH === 'string') {
    const parts = fullCanvaXYWH.split(',').map((value) => Number(value));
    if (parts.length === 4 && !parts.some((value) => Number.isNaN(value))) {
      svgWidth = parts[2];
      svgHeight = parts[3];
    }
  }

  return [
    `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`,
    '<g>',
    `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"`,
    ' fill="rgb(100,100,100)" fill-opacity="0"',
    ' stroke="rgb(255,0,0)" stroke-opacity="0.5" stroke-width="3"/>',
    '</g>',
    '</svg>'
  ].join('');
}

function buildMaeTargetFromXywh(annotation) {
  const xywh = parseXywhTarget(annotation?.target);

  if (!xywh) {
    return null;
  }

  const shape = {
    fill: 'rgba(100,100,100, 0)',
    height: xywh.height,
    id: stableShapeId(annotation, 'shape'),
    scaleX: 1,
    scaleY: 1,
    stroke: 'rgba(255,0, 0, 0.5)',
    strokeWidth: 5,
    type: 'rectangle',
    width: xywh.width,
    x: xywh.x,
    y: xywh.y
  };

  const fullCanvaXYWH =
    annotation?.maeData?.target?.fullCanvaXYWH ||
    `0,0,${Math.ceil(xywh.x + xywh.width)},${Math.ceil(xywh.y + xywh.height)}`;

  return {
    drawingState: JSON.stringify({
      currentShape: shape,
      isDrawing: true,
      shapes: [shape]
    }),
    fullCanvaXYWH,
    scale: annotation?.maeData?.target?.scale || 1,
    svg: buildRectangleSvg(shape, fullCanvaXYWH)
  };
}

function buildMaeTargetFromSvg(annotation) {
  const target = annotation?.target;
  const svg = svgSelectorValue(target);

  if (!svg) {
    return null;
  }

  return {
    drawingState: annotation?.maeData?.target?.drawingState || '',
    fullCanvaXYWH: annotation?.maeData?.target?.fullCanvaXYWH || '',
    scale: annotation?.maeData?.target?.scale || 1,
    svg
  };
}

function maeTargetForAnnotation(annotation) {
  if (annotation?.maeData?.target) {
    return annotation.maeData.target;
  }

  if (typeof annotation?.target === 'string') {
    return buildMaeTargetFromXywh(annotation);
  }

  if (annotation?.target && typeof annotation.target === 'object') {
    return buildMaeTargetFromSvg(annotation);
  }

  return null;
}

function isTaggingMode(annotation) {
  return (
    annotation?.maeData?.templateType === 'tagging' ||
    annotation?.motivation === 'tagging'
  );
}

function normalizeMaeTags(tags) {
  return tags.map((tag) => ({
    label: tag.value || tag.id || tag.label || '',
    value: tag.value || tag.id || tag.label || '',
    ...(tag.__isNew__ ? { __isNew__: true } : {})
  }));
}

/**
 * Converts between Heurist/Web Annotation JSON and the MAE-specific annotation
 * shape expected by mirador-annotation-editor.
 *
 * Important:
 * - Annotation editor mode is controlled by motivation/templateType, not by
 *   target shape. A note/comment annotation may have a string #xywh target or
 *   a complex object target with SvgSelector.
 * - Target geometry is preserved where possible.
 * - Canvas ids are rewritten both ways so Vite-dev relative ids can still use
 *   canonical Heurist ids for API lookup/save.
 */
export class HeuristMaeAnnotationMapper {
  constructor(options = {}) {
    this.canvasId = options.canvasId || null;
    this.lookupCanvasId = options.lookupCanvasId || this.canvasId;
    this.userLabel = options.userLabel || 'Heurist user';
  }

  /**
   * Converts a relative local Heurist canvas URL to the canonical URL used by
   * Heurist annotation lookup.
   */
  static canonicalCanvasId(canvasId, canonicalBaseUrl) {
    if (!canvasId || typeof canvasId !== 'string' || !canonicalBaseUrl) {
      return canvasId;
    }

    if (canvasId.startsWith('/heurist/')) {
      return `${trimTrailingSlash(canonicalBaseUrl)}${canvasId}`;
    }

    return canvasId;
  }

  /**
   * Normalizes a raw API response to AnnotationPage.
   */
  normalizePage(data, fallbackPageId) {
    return normalizeAnnotationPage(data, fallbackPageId);
  }

  /**
   * Heurist/Web Annotation -> MAE annotation.
   */
  toMAE(annotation) {
    if (!annotation || typeof annotation !== 'object') {
      return annotation;
    }

    const rewritten = replaceCanvasIdDeep(annotation, this.lookupCanvasId, this.canvasId);

    if (isTaggingMode(rewritten)) {
      return this.toMaeTaggingAnnotation(rewritten);
    }

    return this.toMaeNoteAnnotation(rewritten);
  }

  /**
   * Heurist/Web Annotation note/comment annotation -> MAE multiple_body annotation.
   */
  toMaeNoteAnnotation(annotation) {
    const originalBodies = asArray(annotation.body);
    const textBody = firstTextBody(annotation);
    const tags = tagBodies(annotation);

    const maeTextBody = textBody
      ? {
          ...textBody,
          purpose: textBody.purpose || 'describing',
          type: 'TextualBody',
          value: plainTextToHtml(textBody.value || '')
        }
      : {
          purpose: 'describing',
          type: 'TextualBody',
          value: ''
        };

    const maeTagBodies = tags.map((tag) => ({
      ...tag,
      id: tag.id || tag.value || tag.label || undefined,
      purpose: 'tagging',
      type: 'TextualBody',
      value: tag.value || tag.id || tag.label || ''
    }));

    const maeTarget = maeTargetForAnnotation(annotation);
    const maeTags = normalizeMaeTags(maeTagBodies);

    return {
      ...annotation,
      body: [maeTextBody, ...maeTagBodies],
      creator: normalizeCreatorForMae(annotation.creator, this.userLabel),
      motivation: annotation.motivation || 'commenting',
      maeData: {
        ...(annotation.maeData || {}),
        tags: maeTags,
        templateType: 'multiple_body',
        textBody: maeTextBody,
        ...(maeTarget ? { target: maeTarget } : {})
      }
    };
  }

  /**
   * Heurist/Web Annotation tag annotation -> MAE tagging annotation.
   */
  toMaeTaggingAnnotation(annotation) {
    const maeTarget = maeTargetForAnnotation(annotation);

    return {
      ...annotation,
      creator: normalizeCreatorForMae(annotation.creator, this.userLabel),
      motivation: 'tagging',
      maeData: {
        ...(annotation.maeData || {}),
        templateType: 'tagging',
        ...(maeTarget ? { target: maeTarget } : {})
      }
    };
  }

  /**
   * AnnotationPage from Heurist/Web Annotation API -> MAE AnnotationPage.
   */
  pageToMAE(page) {
    if (!page || !Array.isArray(page.items)) {
      return page;
    }

    return {
      ...page,
      items: page.items.map((annotation) => this.toMAE(annotation))
    };
  }

  /**
   * MAE annotation -> Heurist/Web Annotation.
   */
  toWebAnnotation(annotation) {
    if (!annotation || typeof annotation !== 'object') {
      return annotation;
    }

    if (isTaggingMode(annotation)) {
      return this.toWebTaggingAnnotation(annotation);
    }

    return this.toWebNoteAnnotation(annotation);
  }

  /**
   * MAE multiple_body note/comment annotation -> Web Annotation for Heurist.
   */
  toWebNoteAnnotation(annotation) {
    const textBody = firstTextBody(annotation);
    const tags = tagBodies(annotation);
    const textValue = htmlToPlainText(textBody?.value || '');

    const normalizedTags = tags
      .map((tag) => ({
        id: tag.id || tag.value || tag.label || undefined,
        type: 'TextualBody',
        purpose: 'tagging',
        value: tag.value || tag.id || tag.label || ''
      }))
      .filter((tag) => tag.value !== '');

    const body = [
      {
        purpose: 'describing',
        type: 'TextualBody',
        value: textValue,
        format: 'text/plain'
      },
      ...normalizedTags
    ];

    const webAnnotation = {
      id: annotation.id,
      type: 'Annotation',
      motivation: annotation.motivation || 'commenting',
      body,
      target: annotation.target
    };

    if (annotation.created) {
      webAnnotation.created = annotation.created;
    }

    if (annotation.modified) {
      webAnnotation.modified = annotation.modified;
    }

    if (annotation.creationDate) {
      webAnnotation.creationDate = annotation.creationDate;
    }

    if (annotation.creator) {
      webAnnotation.creator = annotation.creator;
    }

    if (annotation.maeData) {
      // Preserve rich MAE editor metadata for round-tripping. Heurist can store
      // this in raw annotation JSON even if only selected fields are indexed.
      webAnnotation.maeData = annotation.maeData;
    }

    return replaceCanvasIdDeep(webAnnotation, this.canvasId, this.lookupCanvasId);
  }

  /**
   * MAE tagging annotation -> Web Annotation for Heurist.
   */
  toWebTaggingAnnotation(annotation) {
    const rawBody = annotation.body;

    let bodyValue = '';

    if (typeof rawBody === 'string') {
      bodyValue = rawBody;
    } else if (rawBody && typeof rawBody === 'object') {
      bodyValue = rawBody.value || rawBody.id || rawBody.label || '';
    }

    const webAnnotation = {
      id: annotation.id,
      type: 'Annotation',
      motivation: 'tagging',
      body: {
        type: 'TextualBody',
        purpose: 'tagging',
        value: htmlToPlainText(bodyValue),
        format: 'text/plain'
      },
      target: annotation.target
    };

    if (annotation.created) {
      webAnnotation.created = annotation.created;
    }

    if (annotation.modified) {
      webAnnotation.modified = annotation.modified;
    }

    if (annotation.creationDate) {
      webAnnotation.creationDate = annotation.creationDate;
    }

    if (annotation.creator) {
      webAnnotation.creator = annotation.creator;
    }

    if (annotation.maeData) {
      webAnnotation.maeData = annotation.maeData;
    }

    return replaceCanvasIdDeep(webAnnotation, this.canvasId, this.lookupCanvasId);
  }

  /**
   * Utility exposed for tests/debugging.
   */
  replaceCanvasIdDeep(value, fromCanvasId, toCanvasId) {
    return replaceCanvasIdDeep(value, fromCanvasId, toCanvasId);
  }
}
