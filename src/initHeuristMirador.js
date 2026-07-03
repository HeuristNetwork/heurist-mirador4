/**
 * @file initHeuristMirador.js
 * @brief Initializes Mirador v4 with MAE annotation support.
 * @fileOverview Creates the Mirador viewer, configures the MAE annotation plugin, selects the appropriate annotation adapter, and optionally rewrites local IIIF manifest URLs for Vite development.
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
import Mirador from 'mirador';
import annotationPlugins from 'mirador-annotation-editor';
import { LocalStorageAnnotationAdapter } from './LocalStorageAnnotationAdapter.js';
import { HeuristAnnotationAdapter } from './HeuristAnnotationAdapter.js';
import { createDevManifestUrl } from './iiifDevUrlRewrite.js';

function createAnnotationAdapter(config, canvasId) {
  if (config.annotationMode === 'heurist') {
    return new HeuristAnnotationAdapter({
      annotationServerUrl: config.annotationServerUrl || config.endpointUrl,
      db: config.db,
      canvasId,
      manifestRecId: config.recID,
      userLabel: config.userLabel,
      readonly: config.readonly,
      heuristCanonicalBaseUrl: config.heuristCanonicalBaseUrl
    });
  }

  return new LocalStorageAnnotationAdapter({
    canvasId,
    annotationPageId: `heurist-mirador4-annotation-page:${canvasId}`,
    userLabel: config.userLabel || 'Heurist user'
  });
}


/**
 * Initialize the Heurist Mirador viewer.
 *
 * @param {Object} config Normalized viewer configuration.
 * @returns {Promise<Object>} Mirador viewer instance.
 */
export async function initHeuristMirador(config) {
  if (!config.manifestUrl) {
    throw new Error('Missing manifestUrl in window.heuristMiradorConfig');
  }

  let manifestId = config.manifestUrl;

  if (config.rewriteLocalIiifUrls) {
    manifestId = await createDevManifestUrl(config.manifestUrl);
  }

  const annotationConfig = {
    adapter: (canvasId) => createAnnotationAdapter(config, canvasId),
    allowTargetShapesStyling: true,
    exportLocalStorageAnnotations: true,
    readonly: !!config.readonly
  };

  return Mirador.viewer(
    {
      id: config.id || 'mirador',

      windows: [
        {
          manifestId
        }
      ],

      window: {
        defaultSideBarPanel: 'annotations',
        sideBarOpenByDefault: true
      },

      annotation: annotationConfig,

      annotations: {
        htmlSanitizationRuleSet: 'liberal'
      }
    },
    [
      ...annotationPlugins
    ]
  );
}