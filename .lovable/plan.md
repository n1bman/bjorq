

# Fix: Wall Body Hiding Openings — Split Wall Around Openings

## Root Cause

The wall is a **single solid box** with no holes cut out. Before the Y-position fix, the wall was accidentally half-underground, so openings happened to be visible above the wall's visible area. Now that the wall renders at correct full height, it completely occludes all opening meshes (doors, windows, passages) because they sit inside the solid wall.

**This is not a regression from the 4-pane code** — it's a regression from the Y-position fix applied in the same batch.

## Solution

Replace the single solid wall body with **sub-sections that leave gaps** where openings are. For a wall with openings:

```text
Wall with 1 door + 1 window:

┌────┐          ┌──┐     ┌────────┐
│    │          │above   │        │
│left│  door    │  │win  │ right  │
│strip  gap    │below   │ strip  │
│    │          │  │     │        │
└────┘          └──┘     └────────┘
```

- **Vertical strips**: full-height wall sections between and outside openings
- **Above strips**: wall material above each opening (door/passage/window)
- **Below strips**: wall material below windows (sillHeight > 0)

## Changes — `src/lib/wallGeometry.tsx`

### In `generateWallSegments` (lines 856–869)

Replace the single wall body mesh with a helper that:

1. If `wall.openings` is empty → keep existing mitered geometry (no change)
2. If wall has openings → sort openings by offset, compute local X ranges, generate:
   - Simple box meshes for each gap/strip section
   - Use the same wall materials (colors, textures) for all sections
   - Position each section at the correct local X + Y within the wall's coordinate frame
3. Mitering is preserved on the leftmost and rightmost vertical strips (they include the wall's end faces)

### No changes to opening rendering
All door/window/passage/garage rendering stays exactly as-is. They just become visible because there's no wall material behind them anymore.

### No changes to `openingPresets.ts`
The 6-pane frost preset stays as-is.

## Files
- `src/lib/wallGeometry.tsx` — split wall body around openings

