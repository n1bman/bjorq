// ── API Client for hosted mode ──────────────────────────────────
// Mode detection: HOSTED (server present) or DEV (Lovable preview / local dev)

type AppMode = 'HOSTED' | 'DEV';

let _mode: AppMode | null = null;
let _resolvePromise: Promise<AppMode> | null = null;

/**
 * Resolve the app mode. Runs once, caches result.
 * - VITE_FORCE_DEV=1 → DEV (skip probe)
 * - VITE_FORCE_HOSTED=1 → HOSTED (fail loudly if server unreachable)
 * - Otherwise: probe GET /api/bootstrap with 1000ms timeout
 */
export async function resolveMode(): Promise<AppMode> {
  if (_mode !== null) return _mode;
  if (_resolvePromise) return _resolvePromise;

  _resolvePromise = (async () => {
    // Env overrides
    if (import.meta.env.VITE_FORCE_DEV === '1') {
      _mode = 'DEV';
      console.log('[Mode] Forced DEV via env');
      return _mode;
    }

    if (import.meta.env.VITE_FORCE_HOSTED === '1') {
      // Must succeed
      try {
        const res = await fetch('/api/config', { signal: AbortSignal.timeout(2000) });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        _mode = 'HOSTED';
      } catch (err) {
        console.error('[Mode] VITE_FORCE_HOSTED=1 but server unreachable:', err);
        _mode = 'HOSTED'; // Still set hosted — will fail on API calls
      }
      console.log('[Mode] Forced HOSTED via env');
      return _mode;
    }

    // Default: in Vite dev mode (Lovable preview), skip probe entirely → DEV
    if (import.meta.env.DEV) {
      _mode = 'DEV';
      console.log('[Mode] DEV (Vite dev mode, no probe)');
      return _mode;
    }

    // Production build: probe server
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch('/api/config', { signal: controller.signal });
      clearTimeout(timer);
      _mode = res.ok ? 'HOSTED' : 'DEV';
    } catch {
      _mode = 'DEV';
    }
    console.log('[Mode] Resolved:', _mode);
    return _mode;
  })();

  return _resolvePromise;
}

/** Sync mode check — only valid after resolveMode() completes */
export function isHostedSync(): boolean {
  return _mode === 'HOSTED';
}

/** Legacy alias */
export async function isHosted(): Promise<boolean> {
  const mode = await resolveMode();
  return mode === 'HOSTED';
}

/** Get current mode string (sync, returns null before resolution) */
export function getMode(): AppMode | null {
  return _mode;
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
