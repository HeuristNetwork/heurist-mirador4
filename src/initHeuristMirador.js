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