

# Plan: Fix Vite 500 Error on App.tsx

## Root Cause

The white screen is caused by Vite returning HTTP 500 for `/src/App.tsx?t=1772376042745`. This is NOT a hosted-mode issue — the mode detection code correctly falls into DEV mode in preview.

The `?t=` timestamp is a stale HMR cache-bust parameter from a previous failed compilation (before config files were restored). The Vite dev server cached the failed transform and continues returning 500 for that specific timestamped URL.

## Fix

### 1. Force Vite module graph invalidation — `src/main.tsx`
Add a trivial comment and wrap the render in a try-catch with visible error fallback. This forces Vite to create a new module graph entry, bypassing the cached 500.

```typescript
// Force HMR invalidation
console.log('[App] main.tsx loaded');
try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  console.error('[App] Failed to render:', err);
  document.body.innerHTML = `<pre style="color:red;padding:2rem">${err}</pre>`;
}
```

### 2. Safety fallback in `index.html`
Add a visible loading indicator inside `<div id="root">` so we can distinguish between "JS didn't load" (text visible) and "JS loaded but crashed" (text replaced by React).

```html
<div id="root"><p style="color:white;padding:2rem;font-family:system-ui">Loading…</p></div>
```

These two changes together will:
- Force Vite to recompile the full module graph with a fresh timestamp
- Make any future compile errors visible (not just a white screen)
- If the 500 persists after the invalidation, the loading text will remain visible, confirming the build failure vs runtime crash

