/**
 * @file heuristConfig.js
 * @brief Normalizes runtime configuration for the Heurist Mirador bundle.
 * @fileOverview Reads window.heuristMiradorConfig and legacy endpoint globals. It returns one normalized configuration object used by the viewer bootstrap and annotation adapters.
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
 * Read and normalize the Heurist Mirador runtime configuration.
 *
 * @returns {Object} Normalized viewer and annotation configuration.
 */
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