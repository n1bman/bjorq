import type { CatalogAssetMeta } from '../store/types';

let _cache: CatalogAssetMeta[] | null = null;

/** Validate a single catalog entry has required fields */
function isValidEntry(entry: unknown): entry is CatalogAssetMeta {
  if (!entry || typeof entry !== 'object') return false;
  const e = entry as Record<string, unknown>;
  if (!e.id || typeof e.id !== 'string') return false;
  if (!e.name || typeof e.name !== 'string') return false;
  if (!e.model || typeof e.model !== 'string') return false;
  if (!e.category || typeof e.category !== 'string') return false;
  return true;
}

/** Fetch curated catalog from public/catalog/index.json (cached after first load) */
export async function loadCuratedCatalog(): Promise<CatalogAssetMeta[]> {
  if (_cache) return _cache;
  try {
    const res = await fetch('/catalog/index.json');
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const valid: CatalogAssetMeta[] = [];
    for (const entry of data) {
      if (isValidEntry(entry)) {
        valid.push(entry);
      } else {
        console.warn('[Catalog] Skipping invalid entry:', entry);
      }
    }
    _cache = valid;
    return _cache;
  } catch {
    return [];
  }
}

/** Clear cache (e.g. after adding curated assets) */
export function clearCatalogCache(): void {
  _cache = null;
}
