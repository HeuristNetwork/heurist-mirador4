# Heurist Mirador v4 Integration Bundle

Mirador v4 integration/bundle for Heurist with MAE annotation support.

## 1. Purpose of project

This project builds a standalone JavaScript/CSS bundle that integrates Mirador v4, `mirador-annotation-editor` (MAE), and Heurist-specific annotation adapters.

The bundle is intended to be loaded by Heurist, primarily from `miradorViewer.php` or a successor viewer page. It separates Mirador v4 + MAE build dependencies from the main Heurist codebase, while keeping a small and explicit runtime configuration interface for Heurist.

The main goals are:

- display IIIF Presentation v3 manifests in Mirador v4;
- support MAE annotation display and editing;
- read and write annotations through the Heurist `/api/{db}/annotations` API;
- keep local development simple with Vite;
- produce a distributable bundle that can be copied into the Heurist client tree.

## 2. Requirements

### Heurist

Heurist version **7.4 or later** is required.

The Heurist server must provide:

- IIIF manifest and canvas API endpoints;
- annotation API endpoint `/api/{db}/annotations`;
- support for annotation save payloads using the root `annotation` field;
- RT/DT/term definitions for IIIF annotations, canvases, and manifests;
- a viewer page such as `miradorViewer.php` that supplies runtime configuration.

### JavaScript build environment

Recommended development environment:

- Node.js 22 or later;
- npm 10 or later;
- Vite;
- modern browser with ES module support.

Current dependency baseline:

```json
{
  "mirador": "^4.1.0",
  "mirador-annotation-editor": "1.3.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "@mui/material": "^7.3.5",
  "@mui/system": "^7.3.5",
  "@mui/icons-material": "^7.3.5",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1"
}
```

Do not use `npm audit fix --force` unless the dependency tree has been reviewed afterwards. It may upgrade MUI or related packages to versions that conflict with Mirador.

## 3. Project structure

Typical source layout:

```text
src/
  main.js
  initHeuristMirador.js
  heuristConfig.js
  HeuristAnnotationAdapter.js
  HeuristMaeAnnotationMapper.js
  LocalStorageAnnotationAdapter.js
  iiifDevUrlRewrite.js
  style.css
```

Main responsibilities:

- `main.js` — entry point. Loads CSS, reads runtime config, initializes the viewer.
- `heuristConfig.js` — normalizes `window.heuristMiradorConfig`.
- `initHeuristMirador.js` — creates the Mirador viewer, registers MAE plugins, and selects the annotation adapter.
- `HeuristAnnotationAdapter.js` — MAE storage adapter backed by Heurist annotation API.
- `HeuristMaeAnnotationMapper.js` — converts between Heurist/Web Annotation JSON and MAE annotation format.
- `LocalStorageAnnotationAdapter.js` — development adapter for testing MAE without Heurist API writes.
- `iiifDevUrlRewrite.js` — Vite development helper for rewriting local Heurist URLs in manifests.
- `style.css` — full-viewport layout for Mirador.

## 4. Configuration of adapter

The bundle is configured through a global object defined before loading the bundle:

```js
window.heuristMiradorConfig = {
  id: 'mirador',
  manifestUrl: '/heurist/api/my_database/iiif/manifest/1',

  db: 'my_database',
  recID: 1,

  annotationMode: 'heurist',
  annotationServerUrl: '/heurist/api/my_database/annotations',

  readonly: false,
  userLabel: 'Heurist user',

  rewriteLocalIiifUrls: false,
  heuristCanonicalBaseUrl: null
};
```

### Core options

| Option | Purpose |
| --- | --- |
| `id` | HTML element id for the Mirador container. Default: `mirador`. |
| `manifestUrl` | IIIF manifest URL loaded into Mirador. Required. |
| `db` | Heurist database name. |
| `recID` | Heurist manifest record id. Passed back with annotation writes as `manifestRecID`. |
| `annotationMode` | `heurist` for Heurist API storage, or `localStorage` for development testing. |
| `annotationServerUrl` | Heurist annotation API endpoint, normally `/api/{db}/annotations`. |
| `endpointUrl` | Legacy/fallback endpoint option. |
| `readonly` | Prevents create/update/delete when true. |
| `userLabel` | User label exposed to MAE. |
| `rewriteLocalIiifUrls` | Vite development helper. Rewrites local absolute Heurist URLs to proxy-relative URLs. |
| `heuristCanonicalBaseUrl` | Canonical origin used to map Vite relative canvas IDs back to Heurist API URLs. |

### Heurist annotation mode

Use this mode when annotations are read from and saved to Heurist:

```js
window.heuristMiradorConfig = {
  id: 'mirador',
  manifestUrl: '/heurist/api/osmak_anno12/iiif/manifest/1?omit_annotation_pages=1',
  db: 'osmak_anno12',
  recID: 1,
  annotationMode: 'heurist',
  annotationServerUrl: '/heurist/api/osmak_anno12/annotations',
  readonly: false,
  userLabel: 'Heurist user'
};
```

`HeuristAnnotationAdapter` sends writes in the shape expected by Heurist:

```js
{
  annotation: {
    id: '...',
    type: 'Annotation',
    motivation: 'commenting',
    body: {
      type: 'TextualBody',
      value: '<p>Annotation text</p>',
      format: 'text/html'
    },
    target: '...'
  },
  source: 'mirador',
  manifestRecID: 1
}
```

### Local storage mode

Use this mode to test Mirador + MAE without Heurist API writes:

```js
window.heuristMiradorConfig = {
  id: 'mirador',
  manifestUrl: '/heurist/api/osmak_anno12/iiif/manifest/1',
  annotationMode: 'localStorage',
  userLabel: 'Heurist user'
};
```

Annotations are stored in browser `localStorage` as AnnotationPage JSON.

### Vite local development

When the Vite dev server runs on port `5173` and Heurist runs from local Apache without that port, enable local URL rewriting:

```js
window.heuristMiradorConfig = {
  id: 'mirador',
  manifestUrl: '/heurist/api/osmak_anno12/iiif/manifest/1',
  db: 'osmak_anno12',
  recID: 1,
  annotationMode: 'heurist',
  annotationServerUrl: '/heurist/api/osmak_anno12/annotations',

  rewriteLocalIiifUrls: true,
  heuristCanonicalBaseUrl: 'http://127.0.0.1'
};
```

The Vite config should proxy `/heurist` to local Apache:

```js
server: {
  host: '127.0.0.1',
  port: 5173,
  proxy: {
    '/heurist': {
      target: 'http://127.0.0.1',
      changeOrigin: true,
      secure: false
    }
  }
}
```

## 5. Distribution: Mirador + MAE + adapter bundle

The project should produce a distributable bundle containing Mirador v4, MAE, and the Heurist adapter code.

Typical workflow:

```bash
npm install
npm run build
```

The build output is expected under `dist/`, for example:

```text
dist/
  assets/
    index-*.js
    index-*.css
```

The resulting files can be copied into the Heurist client tree, for example under a viewer-specific distribution folder such as:

```text
external/mirador4/
```

Exact destination and cache-busting rules should be controlled by the Heurist integration step. The generated bundle should be treated as a compiled asset. Source files remain in this standalone project.

## 6. Configuration in Heurist

In production, Heurist should configure the bundle dynamically from `miradorViewer.php`.

The viewer page should:

1. Resolve request parameters such as `db`, `recID`, `q`, `iiif_image`, and readonly mode.
2. Build or resolve the IIIF manifest URL.
3. Build the annotation API endpoint URL.
4. Output the Mirador container element.
5. Define `window.heuristMiradorConfig`.
6. Load the generated JS/CSS bundle.

Example page output:

```html
<div id="mirador"></div>

<script>
window.heuristMiradorConfig = {
  id: 'mirador',
  manifestUrl: '/heurist/api/osmak_anno12/iiif/manifest/1',
  db: 'osmak_anno12',
  recID: 1,
  annotationMode: 'heurist',
  annotationServerUrl: '/heurist/api/osmak_anno12/annotations',
  readonly: false,
  userLabel: 'Heurist user'
};
</script>

<script type="module" src="/external/mirador4/assets/index.js"></script>
```

The final Heurist integration should avoid hardcoded local development options unless running from a development environment.

## 7. Annotation mapping notes

MAE and Heurist use slightly different annotation shapes.

The mapper handles:

- Heurist/Web Annotation JSON → MAE editor annotation;
- MAE editor annotation → Heurist API fields payload;
- canvas URL rewriting between viewer IDs and canonical Heurist API IDs;
- preservation of MAE editor state in `maeData`;
- wrapping outgoing annotations in the root `annotation` key required by Heurist.

Current workflow decisions:

- Note/commenting annotations preserve HTML in the body value and use `format: 'text/html'`.
- Tags in note/commenting annotations are stripped from the Web Annotation body for now.
- Tag support is postponed until the full Heurist tag workflow is implemented.
- MAE `motivation` is preserved as supplied by MAE.
- MAE-specific metadata is kept in raw annotation JSON so the editor can reopen existing annotations.

## 8. Build and development commands

Common commands:

```bash
npm install
npm run dev
npm run build
```

Local Vite URL:

```text
http://127.0.0.1:5173/
```

The local test page can set `window.heuristMiradorConfig` directly in `index.html`.
