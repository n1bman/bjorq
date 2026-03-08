// ── API Client for hosted mode ──────────────────────────────────
// Mode detection: HOSTED (server present) or DEV (Lovable preview / local dev)

type AppMode = 'HOSTED' | 'DEV';

let _mode: AppMode | null = null;
let _resolvePromise: Promise<AppMode> | null = null;

/**
 * Resolve the app mode. Runs once, caches result.
 */
export async function resolveMode(): Promise<AppMode> {
  if (_mode !== null) return _mode;
  if (_resolvePromise) return _resolvePromise;

  _resolvePromise = (async () => {
    if (import.meta.env.VITE_FORCE_DEV === '1') {
      _mode = 'DEV';
      console.log('[Mode] Forced DEV via env');
      return _mode;
    }

    if (import.meta.env.VITE_FORCE_HOSTED === '1') {
      try {
        const res = await fetch('/api/config', { signal: AbortSignal.timeout(2000) });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        _mode = 'HOSTED';
      } catch (err) {
        console.error('[Mode] VITE_FORCE_HOSTED=1 but server unreachable:', err);
        _mode = 'HOSTED';
      }
      console.log('[Mode] Forced HOSTED via env');
      return _mode;
    }

    if (import.meta.env.DEV) {
      _mode = 'DEV';
      console.log('[Mode] DEV (Vite dev mode, no probe)');
      return _mode;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timer);
      const contentType = res.headers.get('content-type') || '';
      _mode = (res.ok && contentType.includes('application/json')) ? 'HOSTED' : 'DEV';
    } catch {
      _mode = 'DEV';
    }
    console.log('[Mode] Resolved:', _mode);
    return _mode;
  })();

  return _resolvePromise;
}

export function isHostedSync(): boolean { return _mode === 'HOSTED'; }
export async function isHosted(): Promise<boolean> { return (await resolveMode()) === 'HOSTED'; }
export function getMode(): AppMode | null { return _mode; }

// ── Bootstrap ──

export async function fetchBootstrap(): Promise<{
  config: Record<string, unknown>;
  profiles: Record<string, unknown>;
  projects: Record<string, unknown>[];
  activeProjectId: string;
}> {
  const res = await fetch('/api/bootstrap');
  if (!res.ok) throw new Error('Failed to fetch bootstrap');
  return res.json();
}

// ── Config ──

export async function fetchConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function saveConfig(data: Record<string, unknown>) {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save config');
  return res.json();
}

// ── Profiles ──

export async function fetchProfiles() {
  const res = await fetch('/api/profiles');
  if (!res.ok) throw new Error('Failed to fetch profiles');
  return res.json();
}

export async function saveProfiles(data: Record<string, unknown>) {
  const res = await fetch('/api/profiles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save profiles');
  return res.json();
}

// ── Projects ──

export async function fetchProjects() {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function saveProject(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save project');
  return res.json();
}

export async function uploadAsset(
  projectId: string, type: string, name: string, variant: string, file: File
) {
  const form = new FormData();
  form.append('type', type);
  form.append('name', name);
  form.append('variant', variant);
  form.append('file', file);

  const res = await fetch(`/api/projects/${projectId}/assets/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Failed to upload asset');
  return res.json();
}

// ── HA Proxy ──

export async function haProxyFetch(path: string, options?: RequestInit) {
  const url = `/api/ha/${path.replace(/^\//, '')}`;
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
}

export async function fetchHAStates(): Promise<any[]> {
  const res = await haProxyFetch('states');
  if (!res.ok) throw new Error('Failed to fetch HA states');
  return res.json();
}

export async function callHAService(
  domain: string, service: string, serviceData: Record<string, unknown>
) {
  return haProxyFetch(`services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
}

// ── Prop asset upload ──

export async function uploadPropAsset(
  projectId: string, file: File,
  metadata: {
    name: string; category?: string; subcategory?: string; placement?: string;
    dimensions?: object; performance?: object; haMapping?: object;
  },
  thumbnailDataUrl?: string
): Promise<{ modelUrl: string; thumbnailUrl?: string; assetId: string } | null> {
  if (!isHostedSync()) return null;

  const form = new FormData();
  form.append('model', file);
  form.append('name', metadata.name);
  if (metadata.category) form.append('category', metadata.category);
  if (metadata.subcategory) form.append('subcategory', metadata.subcategory);
  if (metadata.placement) form.append('placement', metadata.placement);
  if (metadata.dimensions) form.append('dimensions', JSON.stringify(metadata.dimensions));
  if (metadata.performance) form.append('performance', JSON.stringify(metadata.performance));
  if (metadata.haMapping) form.append('haMapping', JSON.stringify(metadata.haMapping));

  if (thumbnailDataUrl) {
    try {
      const res = await fetch(thumbnailDataUrl);
      const blob = await res.blob();
      form.append('thumbnail', blob, 'thumb.png');
    } catch { /* skip thumbnail */ }
  }

  const res = await fetch(`/api/projects/${projectId}/assets/props/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Failed to upload asset');
  return res.json();
}

// ── Catalog ingest ──

export async function ingestToCatalog(
  file: File,
  metadata: {
    name: string; category?: string; subcategory?: string; placement?: string;
    dimensions?: object; performance?: object; ha?: object;
  },
  thumbnailDataUrl?: string,
  force?: boolean
): Promise<{ ok: boolean; assetId: string; path: string } | null> {
  if (!isHostedSync()) return null;

  const form = new FormData();
  form.append('model', file);
  form.append('name', metadata.name);
  if (metadata.category) form.append('category', metadata.category);
  if (metadata.subcategory) form.append('subcategory', metadata.subcategory);
  if (metadata.placement) form.append('placement', metadata.placement);
  if (metadata.dimensions) form.append('dimensions', JSON.stringify(metadata.dimensions));
  if (metadata.performance) form.append('performance', JSON.stringify(metadata.performance));
  if (metadata.ha) form.append('ha', JSON.stringify(metadata.ha));

  if (thumbnailDataUrl) {
    try {
      const r = await fetch(thumbnailDataUrl);
      const blob = await r.blob();
      form.append('thumbnail', blob, 'thumb.png');
    } catch { /* skip */ }
  }

  const url = force ? '/api/catalog/ingest?force=true' : '/api/catalog/ingest';
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    if (res.status === 409) {
      const data = await res.json();
      throw Object.assign(new Error('Conflict'), { status: 409, data });
    }
    throw new Error('Failed to ingest to catalog');
  }
  return res.json();
}

export async function reindexCatalog(): Promise<{ ok: boolean; count: number } | null> {
  if (!isHostedSync()) return null;
  const res = await fetch('/api/catalog/reindex', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reindex catalog');
  return res.json();
}

// ── Catalog management (hosted mode) ──

export async function updateCatalogMeta(
  assetId: string,
  updates: Record<string, unknown>
): Promise<{ ok: boolean; meta: Record<string, unknown> } | null> {
  if (!isHostedSync()) return null;
  const res = await fetch(`/api/catalog/${assetId}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update catalog meta');
  return res.json();
}

export async function replaceCatalogThumbnail(
  assetId: string,
  file: File
): Promise<{ ok: boolean; thumbnail: string } | null> {
  if (!isHostedSync()) return null;
  const form = new FormData();
  form.append('thumbnail', file);
  const res = await fetch(`/api/catalog/${assetId}/thumbnail`, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) throw new Error('Failed to replace thumbnail');
  return res.json();
}

export async function deleteCatalogAsset(
  assetId: string
): Promise<{ ok: boolean } | null> {
  if (!isHostedSync()) return null;
  const res = await fetch(`/api/catalog/${assetId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete catalog asset');
  return res.json();
}

// ── Debounced sync helpers ──

let _profileSyncTimer: ReturnType<typeof setTimeout> | null = null;
let _projectSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(fn: () => void, ms = 500) {
  if (_profileSyncTimer) clearTimeout(_profileSyncTimer);
  _profileSyncTimer = setTimeout(fn, ms);
}

export function debouncedProjectSync(fn: () => void, ms = 1000) {
  if (_projectSyncTimer) clearTimeout(_projectSyncTimer);
  _projectSyncTimer = setTimeout(fn, ms);
}
