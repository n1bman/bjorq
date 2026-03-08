

# Fix: Show ImportTools panel in Build mode Import tab

## Problem
The `ImportTools` component at `src/components/build/import/ImportTools.tsx` contains all the detailed 3D model controls (position, rotation, scale, north angle, sunlight transparency, model stats, remove model). But it's **never rendered** — `BuildModeV2` only shows the minimal `ImportCatalog` (two upload buttons) in the bottom catalog row.

## Solution
Show `ImportTools` as a side panel when the Import tab is active, mirroring how the device placement panel works.

### Change: `src/components/build/BuildModeV2.tsx`

1. Import `ImportTools` at the top (lazy or direct)
2. In the render, next to the device side panel logic (~line 534-538), add a condition:
   - When `tab === 'import'`, show `ImportTools` in a left side panel (same style as the device panel)

```text
┌─────────────────────────────────────────────┐
│ TopToolbar                                  │
├────────┬────────────────────────────────────┤
│Import  │                                    │
│Tools   │   3D / 2D Canvas                   │
│(side   │                                    │
│ panel) │                                    │
├────────┴────────────────────────────────────┤
│ CatalogRow (Planritning / 3D-modell)        │
│ BottomDock                                  │
└─────────────────────────────────────────────┘
```

### Details
- The side panel appears when `tab === 'import'` (regardless of active tool)
- Same width (220px) and styling as the device panel
- `ImportTools` already has all the UI: upload, stats, position/rotation/scale sliders, north angle, opacity, remove button
- The bottom `ImportCatalog` row can remain as a quick-access shortcut, or be hidden when the side panel is visible (since ImportTools already has the upload button)

### Files modified
- `src/components/build/BuildModeV2.tsx` — add ImportTools side panel rendering

One file, ~5 lines added.

