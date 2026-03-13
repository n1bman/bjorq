

# Fix "Module failed to load" — Delete remaining backup .tsx files + add Vite dedupe

## Root Cause

Three `.tsx` backup files still exist in `src/backup/components/build/`:
- `InteractiveWalls3D.tsx`
- `InteractiveWalls3D-preB2.tsx`  
- `Walls3D.tsx`

These contain broken relative imports (e.g., `from '../../store/useAppStore'`) that resolve to non-existent paths from the `src/backup/` location. Vite's module graph tries to transform all `.tsx` files under `src/`, even though `tsconfig.app.json` excludes `src/backup`. This crashes the entire module pipeline, preventing `main.tsx` from loading.

## Plan

### Step 1 — Delete all remaining backup `.tsx` files
Delete the 3 files that are causing Vite to crash:
- `src/backup/components/build/InteractiveWalls3D.tsx`
- `src/backup/components/build/InteractiveWalls3D-preB2.tsx`
- `src/backup/components/build/Walls3D.tsx`

### Step 2 — Add `resolve.dedupe` to Vite config
As a safety measure against future React duplicate-instance issues (suggested by stack overflow context), add dedupe for react, react-dom, three, and @react-three/fiber.

### Step 3 — Exclude `src/backup` from Vite
Add `exclude` to Vite's `optimizeDeps` to prevent any future backup files from being scanned.

### Files Changed
| File | Action |
|------|--------|
| `src/backup/components/build/InteractiveWalls3D.tsx` | Delete |
| `src/backup/components/build/InteractiveWalls3D-preB2.tsx` | Delete |
| `src/backup/components/build/Walls3D.tsx` | Delete |
| `vite.config.ts` | Add `resolve.dedupe` and comment |

