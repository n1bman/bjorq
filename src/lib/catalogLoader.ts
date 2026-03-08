import type { CatalogAssetMeta } from '../store/types';

let _cache: CatalogAssetMeta[] | null = null;

/** Fetch curated catalog from public/catalog/index.json (cached after first load) */
export async function loadCuratedCatalog(): Promise<CatalogAssetMeta[]> {
  if (_cache) return _cache;
  try {
    const res = await fetch('/catalog/index.json');
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    _cache = data;
    return _cache;
  } catch {
    return [];
  }
}

/** Clear cache (e.g. after adding curated assets) */
export function clearCatalogCache(): void {
  _cache = null;
}
