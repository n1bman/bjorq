

# Add 4-Pane Swedish Window Presets

## What We're Adding
Three new window presets in the Fönster toolbar — a classic Swedish tvåluftsfönster (two-sash, 4-pane) with asymmetric horizontal split (35% top, 65% bottom):

1. **4-rutors fönster** — all clear glass
2. **4-rutors frostat variant 1** — clear top, frosted bottom
3. **4-rutors frostat variant 2** — frosted top-left + bottom-right (diagonal pattern, matching reference photos)

All: 1.40×1.00 m, sillHeight 0.9 m, depth 0.15 m.

## Layout
```text
┌───────┬───────┐
│  35%  │  35%  │  ← upper panes (shorter)
├───────┼───────┤
│  65%  │  65%  │  ← lower panes (taller)
└───────┴───────┘
```

## Changes

### 1. `src/lib/openingPresets.ts`
Add three new presets with `style: '4pane'`, `style: '4pane-frost-bottom'`, `style: '4pane-frost-diag'`.

### 2. `src/lib/wallGeometry.tsx` — `renderOpeningModels`
Inside the `op.type === 'window'` branch, detect `style` starting with `'4pane'` and render:
- White outer frame (4 bars) — same pattern as existing windows
- Vertical mullion (center divider)
- Horizontal rail at 35% from top (not centered)
- 4 individual glass panes with per-pane material:
  - `'4pane'`: all clear (`opacity: 0.3, color: #88ccff`)
  - `'4pane-frost-bottom'`: top clear, bottom frosted (`opacity: 0.7, color: #e8eef4, roughness: 0.8`)
  - `'4pane-frost-diag'`: top-left & bottom-right frosted, others clear

Frosted glass: higher opacity (0.7), whitish tint (#e8eef4), high roughness (0.8). Clear glass: existing style.

### 3. No type changes needed
`WallOpening.style` is already `string?` — no schema change required.

## What stays the same
- All existing window/door/passage presets unchanged
- Frame color logic (user material override) unchanged
- Selection highlight, sill rendering, reveal logic all reused

