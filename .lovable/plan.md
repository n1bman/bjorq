

# Plan: Fix "Module failed to load" — Isolate Compilation Error

## What we know

1. Vite returns **HTTP 500** for `/src/App.tsx` — this means a compilation error somewhere in App.tsx's import tree
2. `main.tsx` loads fine (200), `index.css` loads fine (200) — the build pipeline (PostCSS, Tailwind, Vite) works
3. All config files are restored (`vite.config.ts`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.ts`)
4. We cannot see the actual Vite error message in the 500 response body
5. Code inspection of ~30 source files shows no obvious syntax errors or missing imports

## Root cause hypothesis

One of the ~80 source files in App.tsx's deep import tree has a compilation error that Vite's esbuild transform cannot handle. Since we cannot see the actual error, we need to isolate it.

## Strategy: Minimal App → Gradual Rebuild

### Step 1: Replace App.tsx with a minimal version
Strip all imports temporarily. Render just a `<div>Hello</div>`. This confirms the build pipeline works.

### Step 2: Add back imports one group at a time
Add imports in this order (each group = one test):
1. UI components (toaster, sonner, tooltip)
2. React Router + basic pages (NotFound)
3. Store + hooks (useAppStore, useThemeEffect)
4. Index page (which pulls in the entire app)

### Step 3: Fix the failing import
Once we identify which import group breaks the build, we drill down to the specific file and fix the compilation error.

### Safety net
Keep the `index.html` fallback diagnostic and `main.tsx` try-catch from the previous changes.

## Technical details

The minimal App.tsx for Step 1:
```tsx
const App = () => (
  <div style={{ color: 'white', padding: '2rem' }}>
    <h1>HomeTwin — Build OK</h1>
    <p>If you see this, the Vite build pipeline works.</p>
  </div>
);
export default App;
```

If this renders, we know the issue is in the component tree, not in the config. Then we add imports back until we find the failing one. The fix will depend on what we find — likely a TypeScript/ESM issue in one of the 3D components or store files.

