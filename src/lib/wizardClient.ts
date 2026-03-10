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

  // Step 1: Get library list
  const libRes = await wizardFetch('/libraries');
  if (!libRes.ok) throw new Error(`Wizard libraries fetch failed: ${libRes.status}`);
  const libData = await libRes.json();
  const libraries: string[] = Array.isArray(libData)
    ? libData.map((l: any) => typeof l === 'string' ? l : l.name || l.id || 'default')
    : ['default'];

  // Step 2: Fetch catalog index for each library
  const allAssets: WizardAsset[] = [];
  for (const lib of libraries) {
    try {
      const res = await wizardFetch(`/libraries/${encodeURIComponent(lib)}/index`);
      if (!res.ok) continue;
      const data = await res.json();
      const entries = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
      for (const entry of entries) {
        if (entry.id) allAssets.push(entry);
      }
    } catch { /* skip unreachable library */ }
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
  if (!asset.thumbnail) return undefined;
  const base = getBaseUrl();
  if (asset.thumbnail.startsWith('http')) return asset.thumbnail;
  return `${base}${asset.thumbnail.startsWith('/') ? asset.thumbnail : '/' + asset.thumbnail}`;
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
