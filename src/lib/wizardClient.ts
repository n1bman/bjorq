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
  if (_catalogCache && !force) return _catalogCache;
  const res = await wizardFetch('/catalog/index');
  if (!res.ok) throw new Error(`Wizard catalog fetch failed: ${res.status}`);
  const data = await res.json();
  const assets: WizardAsset[] = Array.isArray(data) ? data : (data.assets ?? data.items ?? []);
  _catalogCache = assets;
  return assets;
}

export function clearWizardCatalogCache() {
  _catalogCache = null;
}

export function getWizardModelUrl(assetId: string): string {
  return `${getBaseUrl()}/catalog/asset/${encodeURIComponent(assetId)}/model`;
}

export function getWizardThumbnailUrl(asset: WizardAsset): string | undefined {
  if (!asset.thumbnail) return undefined;
  const base = getBaseUrl();
  // If thumbnail is already absolute, return as-is
  if (asset.thumbnail.startsWith('http')) return asset.thumbnail;
  return `${base}${asset.thumbnail.startsWith('/') ? asset.thumbnail : '/' + asset.thumbnail}`;
}
