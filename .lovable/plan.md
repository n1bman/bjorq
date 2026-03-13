

# Phase 6 — Implementation Plan

## Step 1: Catalog Panel Polish (`BuildModeV2.tsx`)

**Header** (lines 1996-2013): Replace emoji `📍` with `MapPin` icon import. Add warmer background (`bg-secondary/10`), increase title size.

**Search** (line 533-534): `h-7` → `h-8`, icon `size={12}` → `size={14}`, add `bg-secondary/20 rounded-lg`.

**Source filter chips** (lines 540): `h-5 text-[9px]` → `h-7 text-[10px] rounded-lg`. Inactive: `variant='ghost'` with `bg-muted/30`.

**Category filter chips** (lines 549-551): Same sizing bump (`h-7 text-[10px] rounded-lg`), inactive uses `bg-muted/30` instead of outline.

**View toggle** (lines 560-567): `p-1` → `p-1.5`, `rounded-lg`.

**Section headers** (lines 676-683): Add `border-t border-border/30 pt-2 mt-2`, bump text to `text-[11px]`, warmer color.

**Placed items** (lines 707-729): Add `border-t border-border/30 pt-3 mt-3`, increase row padding `py-1.5`, `rounded-lg`.

## Step 2: Asset Card Polish (`BuildModeV2.tsx`)

**Grid cards** (line 637): `min-h-[44px]` → `min-h-[64px]`, `rounded-lg` → `rounded-xl`, `bg-secondary/30` → `bg-secondary/20`, add `border border-transparent hover:border-border/30`.

**Thumbnail** (line 643): `h-16` → `h-20`, add `p-1`.

**Name** (line 649): `text-[10px]` → `text-[11px]`.

**Placement badge**: After dimensions line (line 650-654), add placement type pill if available from catalog item:
```tsx
{placementType && <span className="text-[8px] bg-muted/40 rounded px-1 py-0.5">{placementLabel}</span>}
```
Map: `floor`→`Golv`, `wall`→`Vägg`, `ceiling`→`Tak`, `table`→`Yta`.

**List cards** (line 612): `py-1.5` → `py-2`, add `rounded-lg`, same background softening. Add placement badge inline.

## Step 3: Placement Filter Chips (`BuildModeV2.tsx`)

Add a `placementFilter` state (`null | 'floor' | 'wall' | 'ceiling' | 'table'`). Show filter chips below category row when placement data exists in entries. Filter `allEntries` additively.

## Step 4: Selected Object Feedback (`Props3D.tsx`)

**Selection emissive** (line 285): `#4a9eff` → `#d4a574`, intensity `0.3` → `0.2`.

**Selection ring** (lines 352-357): Color → `#d4a574`, opacity `0.6` → `0.5`. Add second outer ring at `0.65 * scale[0]` with opacity `0.15`.

**Hover state**: Add `isHovered` state. On `onPointerEnter`/`onPointerLeave` (only in build mode with select/furnish tool), toggle it. In `displayScene` memo, when hovered (and not selected), apply emissive `#f5e6d3` at `0.08`. Add `isHovered` to memo deps. Set cursor to `pointer` on enter, reset on leave.

## Step 5: Placement Hint in Inspector (`BuildInspector.tsx`)

In `PropInspector` (after the name section, ~line 526), look up `catItem?.placement` and show a read-only badge:
```tsx
{catItem?.placement && (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] text-muted-foreground">Placering</span>
    <span className="text-[10px] bg-muted/40 rounded px-1.5 py-0.5">{PLACEMENT_LABELS[catItem.placement]}</span>
  </div>
)}
```

## Step 6: Cozy Visual Refinement

**`environmentEngine.ts`** (line 270): Warm hemisphere ground color `[0.23, 0.35, 0.16]` → `[0.28, 0.35, 0.14]` (+0.05 R, -0.02 B). Increase `indoorBounce` minimum (line 225) from `0.3` → `0.35`.

**`materials.ts`**: Increase wood roughness by +0.03. Warm wood hex tones slightly. Add `mat-warm-wood-floor` preset: `{ id: 'mat-warm-wood-floor', name: 'Varm trägolv', type: 'wood', color: '#c8a060', roughness: 0.72 }`. Increase tile roughness +0.02.

**`index.css`**: Glass panel border opacity `/0.6` → `/0.4`. Shadow intensity reduction. Warm `--card` hue slightly (`14%` → `15%` lightness).

## Files Changed

| File | Changes |
|------|---------|
| `src/components/build/BuildModeV2.tsx` | Catalog panel polish, card sizing, placement badges, placement filter, MapPin import |
| `src/components/build/Props3D.tsx` | Warm selection highlight, hover state, dual ring |
| `src/components/build/BuildInspector.tsx` | Placement hint label in PropInspector |
| `src/lib/environmentEngine.ts` | Warmer ground color, higher indoor fill minimum |
| `src/lib/materials.ts` | Warmer wood, new preset, tile roughness |
| `src/index.css` | Softer glass panel, warmer card |

## Preserved

All placement logic, HA linking, weather/sun sync, project IO, device placement, Bibliotek workspace. No architectural changes. No new dependencies.

## Touch Considerations

All filter chips and cards get larger hit targets (h-7 minimum, 64px card height). Hover state is additive — selected state remains the primary feedback for touch users.

