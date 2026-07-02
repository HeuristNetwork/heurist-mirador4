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

export function rewriteIiifUrlsForViteDev(value) {
//console.log(value);    
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