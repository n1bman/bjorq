

# Fix "Module failed to load" + Clean Up Build State

## Root Cause Analysis

The "Module failed to load" error fires from the HTML `onerror` handler when Vite cannot serve `/src/main.tsx`. Two likely causes:

1. **Backup `.tsx` files inside `src/`** — While `tsconfig.app.json` excludes `src/backup`, Lovable's `componentTagger` plugin or Vite's file watcher may still attempt to process these files. The backup files contain broken relative imports (e.g., `src/backup/store/useAppStore.ts` imports from `../lib/haMapping` which resolves to `src/backup/lib/haMapping` — a path that doesn't exist). This can crash Vite's transform pipeline.

2. **Unused `useRef` import** in `InteractiveWalls3D.tsx` — minor, unlikely to cause build failure, but should be cleaned.

## Plan

### Step 1 — Move all backup files out of `src/`

Rename all backup `.tsx`/`.ts` files to `.bak` extension so Vite/TypeScript ignore them completely:

| File | Action |
|------|--------|
| `src/backup/components/build/InteractiveWalls3D.tsx` | Rename to `.tsx.bak` |
| `src/backup/components/build/InteractiveWalls3D-preB2.tsx` | Rename to `.tsx.bak` |
| `src/backup/components/build/Walls3D.tsx` | Rename to `.tsx.bak` |
| `src/backup/components/BottomNav.tsx` | Rename to `.tsx.bak` |
| `src/backup/components/ModeHeader.tsx` | Rename to `.tsx.bak` |
| `src/backup/components/home/HomeNav.tsx` | Rename to `.tsx.bak` |
| `src/backup/lib/wallGeometry.tsx` | Rename to `.tsx.bak` |
| `src/backup/store/types.ts` | Rename to `.ts.bak` |
| `src/backup/store/useAppStore.ts` | Rename to `.ts.bak` |

Since Lovable can't rename files, I'll convert these to plaintext `.bak` files that Vite won't process.

### Step 2 — Clean up unused imports

Remove `useRef` from `InteractiveWalls3D.tsx` line 7.

### Step 3 — Add "Clear All Walls" action

The user wants to reset old wall/build data. I'll add a "Rensa alla väggar" button to the existing build tools or inspector that calls:
```typescript
// Clear walls, rooms, and openings for the active floor
pushUndo();
set(s => ({ layout: { ...s.layout, floors: s.layout.floors.map(f => 
  f.id === activeFloorId ? { ...f, walls: [], rooms: [] } : f
)}}));
```

This will be placed in the existing Planritning toolbar area (likely near the existing "Clear All" or structure tools).

### Files Changed

| File | Action |
|------|--------|
| `src/components/build/InteractiveWalls3D.tsx` | Remove unused `useRef` import |
| `src/components/build/BuildTopToolbar.tsx` | Add "Rensa väggar" button in Planritning |
| 9 backup files | Convert to `.bak` to stop Vite processing |

### What Is Preserved
- All Phase A/B work (wallGeometry, wallFaces, face-aware painting)
- All wall rendering, room detection, opening placement
- Save/load compatibility
- HA bridge, weather, environment sync

