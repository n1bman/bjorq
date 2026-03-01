// ── API Client for hosted mode ──────────────────────────────────
// When the app runs behind the Node host (server/server.js),
// all reads/writes go through /api/* endpoints.
// When not hosted, the app falls back to localStorage via Zustand persist.

let _hostedResult: boolean | null = null;
let _probePromise: Promise<boolean> | null = null;

export async function isHosted(): Promise<boolean> {
  if (_hostedResult !== null) return _hostedResult;
  if (_probePromise) return _probePromise;

  _probePromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timer);
      _hostedResult = res.ok;
    } catch {
      _hostedResult = false;
    }
    return _hostedResult;
  })();

  return _probePromise;
}

// Sync version — only valid after probe completes
export function isHostedSync(): boolean {
  return _hostedResult === true;
}

// ── Bootstrap (single fetch for all data) ──

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
  projectId: string,
  type: string,
  name: string,
  variant: string,
  file: File
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

// ── HA Proxy (token NEVER sent to browser) ──

export async function haProxyFetch(path: string, options?: RequestInit) {
  const url = `/api/ha/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res;
}

/** Fetch all HA entity states via server proxy */
export async function fetchHAStates(): Promise<any[]> {
  const res = await haProxyFetch('states');
  if (!res.ok) throw new Error('Failed to fetch HA states');
  return res.json();
}

/** Call an HA service via server proxy */
export async function callHAService(
  domain: string,
  service: string,
  serviceData: Record<string, unknown>
) {
  const res = await haProxyFetch(`services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(serviceData),
  });
  return res;
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
