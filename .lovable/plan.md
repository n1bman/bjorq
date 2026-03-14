

# Add Classic 4-Panel Swedish Door (Spegeldörr)

## Overview
Add a new door style `'panel-4'` — a classic Swedish 4-panel interior door with arched top panel, two vertical middle panels, and a wide bottom panel. White-painted with raised panels and a metal handle on the right side.

## Layout
```text
┌─────────────────┐
│   TOP PANEL     │
│   (arched top)  │
├────────┬────────┤
│  MID   │  MID   │
│  LEFT  │  RIGHT │
├────────┴────────┤
│  BOTTOM PANEL   │
│                 │
└─────────────────┘
```

## Changes

### 1. `src/lib/openingPresets.ts`
Add one new preset after the existing door entries (line 21):
```
{ id: 'door-panel4', label: 'Spegeldörr', type: 'door', width: 0.9, height: 2.0, sillHeight: 0, style: 'panel-4', description: '90 cm klassisk 4-spegels innerdörr' }
```

### 2. `src/lib/wallGeometry.tsx` — Door rendering (around line 310–410)
Add a new branch `op.style === 'panel-4'` inside the `op.type === 'door'` block. This renders:

- **Door frame**: Same as existing doors (top, left, right frame bars)
- **Door leaf**: A flat white panel (0.04m thick, `#f5f0eb`) filling the frame
- **4 raised panels** (slightly offset in Z, ~0.005m proud of the leaf):
  - **Top panel**: Full width, ~25% height, with a slight arch effect (a thin curved element at the top edge)
  - **Two middle panels**: Side by side with a vertical stile between them, ~45% height
  - **Bottom panel**: Full width, ~25% height
- **Stiles and rails**: Thin bars (`#e8e0d8`) forming the grid between panels — one horizontal rail between top and middle sections, one between middle and bottom, one vertical mullion splitting the middle row
- **Handle**: Metal handle on the right side at 1.0m height (same as existing doors)
- **Keyhole**: Small dark cylinder below the handle

All panels use a slightly warm white (`#f0ebe5`) with subtle roughness variation to suggest raised woodwork. The frame uses standard `frameColor`.

### Technical Notes
- Reuses the same `localX`, `opPos`, `origCx/origCz`, `angle`, `elevation` coordinate system as existing door styles
- All panel meshes use `polygonOffset` if needed (matching other openings)
- The arch on the top panel is approximated with a thin half-cylinder mesh at its upper edge

