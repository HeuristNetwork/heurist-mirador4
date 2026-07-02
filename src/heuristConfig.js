export function getHeuristMiradorConfig() {
  const cfg = window.heuristMiradorConfig || {};

  return {
    id: cfg.id || 'mirador',
    manifestUrl: cfg.manifestUrl || null,

    db: cfg.db || null,
    recID: cfg.recID || null,
    q: cfg.q || null,
    iiifImage: cfg.iiifImage || null,

    endpointUrl: cfg.endpointUrl || window.endpointUrl || null,
    annotationServerUrl: cfg.annotationServerUrl || cfg.endpointUrl || window.endpointUrl || null,

    readonly: !!cfg.readonly,
    annotationMode: cfg.annotationMode || 'localStorage',

    userLabel: cfg.userLabel || 'Heurist user',

    // Development helper for Vite dev server.
    // Rewrites local absolute Heurist URLs in IIIF manifests so Mirador can fetch them through the Vite proxy.
    rewriteLocalIiifUrls: !!cfg.rewriteLocalIiifUrls,
    heuristCanonicalBaseUrl: cfg.heuristCanonicalBaseUrl || null
  };
}