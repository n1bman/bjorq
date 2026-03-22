import { toast } from 'sonner';

type AppMode = 'HOSTED' | 'DEV';

let _mode: AppMode | null = null;
let _resolvePromise: Promise<AppMode> | null = null;
let _authToastCooldown = 0;

export function notifyAuthRequired(message = 'Lås upp adminläge för att fortsätta.') {
  const now = Date.now();
  if (now - _authToastCooldown > 3000) {
    toast.error(message);
    _authToastCooldown = now;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bjorq-auth-required'));
  }
}

async function parseJsonSafe(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return null;
}

async function requestJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    if (res.status === 401) {
      notifyAuthRequired();
    }
    const data = await parseJsonSafe(res);
    throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status, data });
  }
  return res.json();
}

export async function resolveMode(): Promise<AppMode> {
  if (_mode !== null) return _mode;
  if (_resolvePromise) return _resolvePromise;

  _resolvePromise = (async () => {
    if (import.meta.env.VITE_FORCE_DEV === '1') {
      _mode = 'DEV';
      return _mode;
    }

    if (import.meta.env.VITE_FORCE_HOSTED === '1') {
      _mode = 'HOSTED';
      return _mode;
    }

    if (import.meta.env.DEV) {
      _mode = 'DEV';
      return _mode;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timer);
      const contentType = res.headers.get('content-type') || '';
      _mode = res.ok && contentType.includes('application/json') ? 'HOSTED' : 'DEV';
    } catch {
      _mode = 'DEV';
    }

    return _mode;
  })();

  return _resolvePromise;
}

export function isHostedSync(): boolean { return _mode === 'HOSTED'; }
export async function isHosted(): Promise<boolean> { return (await resolveMode()) === 'HOSTED'; }
export function getMode(): AppMode | null { return _mode; }

export interface AuthStatus {
  configured: boolean;
  unlocked: boolean;
}

export async function fetchBootstrap(): Promise<{
  config: Record<string, unknown>;
  profiles: Record<string, unknown>;
  projects: Record<string, unknown>[];
  activeProjectId: string;
  auth?: AuthStatus;
}> {
  return requestJson('/api/bootstrap');
}

export async function fetchConfig() {
  return requestJson('/api/config');
}

export async function saveConfig(data: Record<string, unknown>) {
  return requestJson('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchProfiles() {
  return requestJson('/api/profiles');
}

export async function saveProfiles(data: Record<string, unknown>) {
  return requestJson('/api/profiles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchProjects() {
  return requestJson('/api/projects');
}

export async function saveProject(id: string, data: Record<string, unknown>) {
  return requestJson(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function uploadAsset(projectId: string, type: string, name: string, variant: string, file: File) {
  const form = new FormData();
  form.append('type', type);
  form.append('name', name);
  form.append('variant', variant);
  form.append('file', file);
  return requestJson(`/api/projects/${projectId}/assets/upload`, { method: 'POST', body: form });
}

export async function fetchLiveSnapshot(): Promise<{
  status: string;
  entities: any[];
  liveStates: Record<string, { state: string; attributes: Record<string, unknown> }>;
  vacuumSegmentMap: Record<string, number>;
}> {
  return requestJson('/api/live/snapshot');
}

export async function fetchHAStates(): Promise<any[]> {
  const snapshot = await fetchLiveSnapshot();
  return Object.entries(snapshot.liveStates).map(([entityId, value]) => ({
    entity_id: entityId,
    state: value.state,
    attributes: value.attributes,
  }));
}

export async function callHAService(domain: string, service: string, serviceData: Record<string, unknown>) {
  return requestJson('/api/live/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, service, data: serviceData }),
  });
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  return requestJson('/api/auth/status');
}

export async function setupAdminPin(pin: string): Promise<AuthStatus> {
  return requestJson('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

export async function loginAdminPin(pin: string): Promise<AuthStatus> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
}

export async function logoutAdmin(): Promise<AuthStatus> {
  return requestJson('/api/auth/logout', { method: 'POST' });
}

export async function changeAdminPin(currentPin: string, nextPin: string): Promise<AuthStatus> {
  return requestJson('/api/auth/change-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPin, nextPin }),
  });
}

export async function exportHostedBackup() {
  return requestJson('/api/backup/export');
}

export async function restoreHostedBackup(payload: Record<string, unknown>) {
  return requestJson('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

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

  return requestJson(`/api/projects/${projectId}/assets/props/upload`, {
    method: 'POST',
    body: form,
  });
}

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
  try {
    return await requestJson(url, { method: 'POST', body: form });
  } catch (err: any) {
    if (err.status === 409) throw err;
    throw err;
  }
}

export async function reindexCatalog(): Promise<{ ok: boolean; count: number } | null> {
  if (!isHostedSync()) return null;
  return requestJson('/api/catalog/reindex', { method: 'POST' });
}

export async function updateCatalogMeta(assetId: string, updates: Record<string, unknown>) {
  if (!isHostedSync()) return null;
  return requestJson(`/api/catalog/${assetId}/meta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function replaceCatalogThumbnail(assetId: string, file: File) {
  if (!isHostedSync()) return null;
  const form = new FormData();
  form.append('thumbnail', file);
  return requestJson(`/api/catalog/${assetId}/thumbnail`, {
    method: 'PUT',
    body: form,
  });
}

export async function deleteCatalogAsset(assetId: string) {
  if (!isHostedSync()) return null;
  return requestJson(`/api/catalog/${assetId}`, { method: 'DELETE' });
}

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
