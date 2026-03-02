

## Fix Plan: 4 Issues

### 1. DEV mode cannot connect to HA

**Root cause:** In the Lovable preview (production build), `import.meta.env.DEV` is `false`. The mode probe fetches `GET /api/config` which returns `200 OK` with HTML (SPA fallback at line 36-38 of server.js). Since `res.ok` is true, mode resolves to `HOSTED`. All HA calls then go through the non-existent `/api/ha/*` proxy and fail.

**Fix in `src/lib/apiClient.ts` line 54:**
After the probe response, check that `content-type` includes `application/json`. If not, it's an SPA fallback → DEV.

```typescript
const contentType = res.headers.get('content-type') || '';
_mode = (res.ok && contentType.includes('application/json')) ? 'HOSTED' : 'DEV';
```

---

### 2. Hosted mode: vacuum, speaker, TV not syncing

**Root cause:** Timing race in `Index.tsx`. The hooks `useHomeAssistant()`, `useHABridge()`, `useVacuumRoomSync()` all mount immediately and call `isHostedSync()` which returns `false` because `initHostedMode()` hasn't resolved yet. The hosted REST polling branch in `useHomeAssistant` is never entered. Lights appear to work because `haServiceCaller` is set later (line 27), but incoming state updates never arrive for vacuum/speaker/TV.

**Fix in `src/pages/Index.tsx`:**
Split into `Index` (runs init) and `IndexInner` (mounts hooks). Only render `IndexInner` after `initDone` is true:

```typescript
const IndexInner = () => {
  const appMode = useAppStore((s) => s.appMode);
  useHomeAssistant();
  useHABridge();
  useVacuumRoomSync();
  useIdleTimer();
  // ... render based on appMode
};

const Index = () => {
  const [initDone, setInitDone] = useState(false);
  useEffect(() => {
    initHostedMode().then((hosted) => {
      if (hosted) {
        haServiceCaller.current = (d, s, data) =>
          callHAService(d, s, data).catch(console.warn);
      }
    }).finally(() => setInitDone(true));
  }, []);
  return initDone ? <IndexInner /> : null;
};
```

**Additionally in `src/hooks/useHomeAssistant.ts`:**
Add hosted-mode vacuum segment discovery via REST after first successful poll (reuse existing `callHAService` + segment parsing logic from the WebSocket handler).

---

### 3. 3D models unstable in hosted mode

**Root cause:** Two compounding problems:
- `syncProjectToServer()` strips `fileData` from the payload (line 100-101 in useAppStore.ts) to avoid sending huge base64 to the server. The URL saved is a blob URL.
- On page reload, the blob URL is dead and `fileData` is `undefined` → `useRestoredUrl()` has nothing to restore from → model fails to load.

**Fix in `src/components/build/ImportedHome3D.tsx`:**
In hosted mode, after a model is imported, upload the GLB file to the server via the existing asset upload endpoint (`/api/projects/:id/assets/upload`). Store the server-relative URL (e.g., `/projects/home/assets/building/abc123/files/balanced.glb`) instead of a blob URL. This URL survives reloads.

Changes:
- In `useRestoredUrl()`: if hosted mode and URL starts with `/projects/`, use it directly (it's a server path, always valid).
- In the import flow (where the blob URL is created): if hosted, also upload to server and store the server URL.

**Fix in `src/store/useAppStore.ts`:**
In `syncProjectToServer`, don't strip `fileData` if the URL is already a server path (starts with `/projects/`). This is a safety net — the URL alone is sufficient.

---

### 4. Version mismatch

**Current state:**
- `package.json`: **0.2.5**
- `bjorq_dashboard/config.yaml`: **0.2.8**
- `CHANGELOG.md`: has 0.2.8 entry

**Fix:** Bump `package.json` version to `0.2.8`.

---

### Files to modify

| File | Change |
|------|--------|
| `src/lib/apiClient.ts` | Check content-type header in mode probe |
| `src/pages/Index.tsx` | Split into Index + IndexInner; gate hooks on initDone |
| `src/hooks/useHomeAssistant.ts` | Add REST-based vacuum segment discovery for hosted mode |
| `src/components/build/ImportedHome3D.tsx` | Use server asset URL in hosted mode; improve restoration logic |
| `src/store/useAppStore.ts` | Preserve server URLs in project sync |
| `package.json` | Version 0.2.5 → 0.2.8 |

