// ── BJORQ Asset Wizard API Client ──────────────────────────────

import { useAppStore } from '../store/useAppStore';

export interface WizardAsset {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  thumbnail?: string;
  boundingBox?: { min: [number, number, number]; max: [number, number, number] };
  center?: { x: number; y: number; z: number };
  estimatedScale?: number;
  triangleCount?: number;
  fileSize?: number;
  targetProfile?: string;
}

let _catalogCache: WizardAsset[] | null = null;
let _catalogCacheUrl: string = '';

function getBaseUrl(): string {
  return useAppStore.getState().wizard.url.replace(/\/+$/, '');
}

async function wizardFetch(path: string, options?: RequestInit): Promise<Response> {
  const base = getBaseUrl();
  if (!base) throw new Error('Wizard URL not configured');
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, { ...options, signal: options?.signal ?? AbortSignal.timeout(5000) });
}

export async function testWizardConnection(): Promise<{ ok: boolean; version?: string }> {
  try {
    const [healthRes, versionRes] = await Promise.all([
      wizardFetch('/health'),
      wizardFetch('/version'),
    ]);
    if (!healthRes.ok) return { ok: false };
    let version: string | undefined;
    try {
      const v = await versionRes.json();
      version = v.version || v.v || String(v);
    } catch { /* ignore */ }
    return { ok: true, version };
  } catch {
    return { ok: false };
  }
}

export async function fetchWizardCatalog(force = false): Promise<WizardAsset[]> {
  const currentUrl = getBaseUrl();
  if (_catalogCache && !force && _catalogCacheUrl === currentUrl) return _catalogCache;

  const allAssets: WizardAsset[] = [];

  // Strategy 1: Try /catalog/index (single call, most reliable)
  try {
    const res = await wizardFetch('/catalog/index', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
      for (const entry of entries) {
        if (entry.id) allAssets.push(entry);
      }
    } else {
      console.warn(`[Wizard] /catalog/index → ${res.status}`);
    }
  } catch (e) {
    console.warn('[Wizard] /catalog/index failed:', e);
  }

  // Strategy 2: If /catalog/index returned nothing, try /libraries/:lib/index
  if (allAssets.length === 0) {
    try {
      const libRes = await wizardFetch('/libraries');
      if (libRes.ok) {
        const libData = await libRes.json();
        const libraries: string[] = Array.isArray(libData)
          ? libData.map((l: any) => typeof l === 'string' ? l : l.name || l.id || 'default')
          : ['default'];
        for (const lib of libraries) {
          try {
            const res = await wizardFetch(`/libraries/${encodeURIComponent(lib)}/index`, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) { console.warn(`[Wizard] /libraries/${lib}/index → ${res.status}`); continue; }
            const data = await res.json();
            const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
            for (const entry of entries) {
              if (entry.id) allAssets.push(entry);
            }
          } catch (e) { console.warn(`[Wizard] /libraries/${lib}/index error:`, e); }
        }
      } else {
        console.warn(`[Wizard] /libraries → ${libRes.status}`);
      }
    } catch (e) {
      console.warn('[Wizard] /libraries fetch failed:', e);
    }
  }

  _catalogCache = allAssets;
  _catalogCacheUrl = currentUrl;
  return allAssets;
}

export function clearWizardCatalogCache() {
  _catalogCache = null;
}

export function getWizardModelUrl(assetId: string): string {
  return `${getBaseUrl()}/assets/${encodeURIComponent(assetId)}/model`;
}

export function getWizardThumbnailUrl(assetId: string): string {
  return `${getBaseUrl()}/assets/${encodeURIComponent(assetId)}/thumbnail`;
}

export function getWizardAssetThumbnail(asset: WizardAsset): string | undefined {
  if (!asset.id) return undefined;
  try {
    return getWizardThumbnailUrl(asset.id);
  } catch {
    if (!asset.thumbnail) return undefined;
    const base = getBaseUrl();
    if (asset.thumbnail.startsWith('http')) return asset.thumbnail;
    return `${base}${asset.thumbnail.startsWith('/') ? asset.thumbnail : '/' + asset.thumbnail}`;
  }
}

export function getWizardThumbnailFallbackUrl(assetId?: string | null): string | undefined {
  if (!assetId) return undefined;
  try {
    return getWizardThumbnailUrl(assetId);
  } catch {
    return undefined;
  }
}

export function looksLikeWizardThumbnailUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const base = getBaseUrl();
    return url.startsWith(`${base}/assets/`) || url.startsWith('/assets/');
  } catch {
    return url.startsWith('/assets/');
  }
}

export async function downloadWizardModel(assetId: string): Promise<Blob> {
  const res = await wizardFetch(`/assets/${encodeURIComponent(assetId)}/model`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Model download failed: ${res.status}`);
  return res.blob();
}

export async function downloadWizardThumbnail(assetId: string): Promise<Blob | null> {
  try {
    const res = await wizardFetch(`/assets/${encodeURIComponent(assetId)}/thumbnail`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

export async function fetchWizardAssetMeta(assetId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await wizardFetch(`/assets/${encodeURIComponent(assetId)}/meta`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
