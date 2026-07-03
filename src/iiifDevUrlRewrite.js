/**
 * @file iiifDevUrlRewrite.js
 * @brief Rewrites local Heurist IIIF URLs for Vite development.
 * @fileOverview Fetches a manifest through the Vite dev server and rewrites absolute localhost Heurist URLs to proxy-relative URLs. The rewritten manifest is returned as a Blob URL for Mirador to load.
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
function isLocalHeuristUrl(value) {
  return (
    typeof value === 'string' &&
    (
      value.startsWith('http://127.0.0.1/heurist/') ||
      value.startsWith('http://localhost/heurist/')
    )
  );
}

function rewriteLocalHeuristUrl(value) {
  if (!isLocalHeuristUrl(value)) {
    return value;
  }

  return value
    .replace('http://127.0.0.1/heurist/', '/heurist/')
    .replace('http://localhost/heurist/', '/heurist/');
}

/**
 * Recursively rewrite local Heurist URLs in an IIIF manifest-like value.
 *
 * @param {*} value Value to inspect.
 * @returns {*} Rewritten value.
 */
export function rewriteIiifUrlsForViteDev(value) {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteIiifUrlsForViteDev(item));
  }

  if (value && typeof value === 'object') {
    const rewritten = {};

    Object.entries(value).forEach(([key, item]) => {
      rewritten[key] = rewriteIiifUrlsForViteDev(item);
    });

    return rewritten;
  }

  if (typeof value === 'string') {
    return rewriteLocalHeuristUrl(value);
  }

  return value;
}

/**
 * Create a Blob URL for a locally rewritten IIIF manifest.
 *
 * @param {string} manifestUrl Manifest URL to fetch.
 * @returns {Promise<string>} Blob URL containing the rewritten manifest JSON.
 */
export async function createDevManifestUrl(manifestUrl) {
  const response = await fetch(manifestUrl, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to load manifest ${manifestUrl}: HTTP ${response.status}`);
  }

  const manifest = await response.json();
  const rewrittenManifest = rewriteIiifUrlsForViteDev(manifest);

  const blob = new Blob(
    [JSON.stringify(rewrittenManifest)],
    {
      type: 'application/json'
    }
  );

  return URL.createObjectURL(blob);
}