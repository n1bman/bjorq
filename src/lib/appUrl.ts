function getBaseHref() {
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
  if (typeof window !== 'undefined') return window.location.href;
  return '/';
}

export function resolveAppUrl(path: string) {
  return new URL(path.replace(/^\/+/, ''), getBaseHref()).toString();
}

