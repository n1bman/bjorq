

# Build Mode — Full Functional Audit & Implementation Plan

## 1. AUDIT FINDINGS

### A. Broken / Non-functional

1. **`flipped` property does nothing in 3D** — The toggle exists in the inspector, the property is stored, but neither `Walls3D.tsx` nor `InteractiveWalls3D.tsx` read `op.flipped` to alter rendering. Door panels, handles, and window sills render on the same side regardless.

2. **Corner blocks use hardcoded `#e0e0e0`** — Both `Walls3D.tsx` (line 419) and `InteractiveWalls3D.tsx` (line 511) render corner fill blocks with a fixed gray color instead of inheriting the wall's material/color. This creates visible mismatches.

3. **Paint tool in bottom dock is redundant** — Paint (Måla) exists as a primary dock tool (line 257) AND as material pickers inside Wall/Room inspectors. The dock tool requires selecting an object first anyway, making it a confusing duplicate.

4. **No "open doorway" / passage type** — The `WallOpening.type` only supports `'door' | 'window' | 'garage-door'`. There is no passageway/empty opening option despite this being a standard architectural element.

5. **Reference controls panel visible at ALL times when a reference image is loaded** — `ReferenceControls` renders whenever `referenceDrawing?.url` is set (line 1598), regardless of active tool. The user requested it only be visible during Import mode.

### B. Inconsistent / Illogical

6. **Wall thickness default 0.15m** — Used in both `addRoomFromRect` (line 613) and wall drawing (line 1213). Swedish standard exterior walls are 0.20–0.25m. Interior walls are 0.10–0.15m. Having a single 0.15m default for all walls is inaccurate.

7. **Opening presets slightly off Scandinavian standards** — Door heights are 2.1m (correct for Sweden). Window sill height 0.9m is correct. Garage door single at 2.5m width is low for Swedish standard (typically 2.4–3.0m). Overall acceptable but could use a standard interior door width of 0.8m (M8) alongside 0.9m (M9).

8. **Ceiling height default 2.5m** — Correct for Swedish standard (min 2.4m for habitable rooms).

9. **`require()` used for dynamic import** — Line 1511 in `useAppStore.ts` uses CommonJS `require('../lib/roomDetection')` which may fail in ESM-only environments. Should use dynamic `import()`.

### C. Missing Features

10. **No open doorway / passage opening type** — Users need adjustable-width wall openings without door panels.

11. **Prop inspector HA entity link is disabled** — Line 536-544 shows `opacity-50` and `disabled` on the HA entity input for furniture. This should be functional.

12. **Furniture catalog lacks category assignment UI** — Catalog items have a `category` field but no UI to change it after import.

### D. Working Correctly

- Wall drawing with angle lock and auto-close ✓
- Room rectangle tool ✓
- Auto room detection (debounced 300ms) ✓
- Door/window/garage placement by clicking walls ✓
- Wall height presets (Låg/Mellan/Hög) ✓
- Opening inspector with presets, dimensions, style, position ✓
- Undo/redo ✓
- Floor management ✓
- Device placement and inspector ✓
- Furniture upload, placement, and inspector ✓
- Wall mitering ✓
- 2D/3D mode switch ✓
- Select tool with drag support for nodes, walls, openings, devices, props ✓
- Measure tool ✓
- Erase tool ✓

---

## 2. PRIORITIZED IMPLEMENTATION PLAN

### Phase 1 — Fix broken things

**1.1 Corner blocks inherit wall material** — In both `Walls3D.tsx` and `InteractiveWalls3D.tsx`, compute the dominant wall color at each node (from the walls connecting there) and apply it to the corner block instead of hardcoded `#e0e0e0`.

Files: `src/components/build/Walls3D.tsx`, `src/components/build/InteractiveWalls3D.tsx`

**1.2 Implement `flipped` in 3D rendering** — When `op.flipped === true`, mirror the z-offset of door panels, handles, window sills, and interior reveals relative to the wall normal. This affects both `Walls3D.tsx` and `InteractiveWalls3D.tsx` in the opening rendering sections.

Files: `src/components/build/Walls3D.tsx`, `src/components/build/InteractiveWalls3D.tsx`

**1.3 Reference controls only visible in Import mode** — Conditionally render `<ReferenceControls />` only when `activeTool === 'import'` OR when the Import tab is active. Change the condition at line 1598 from checking `referenceDrawing?.url` to also requiring import-related context.

Files: `src/components/build/BuildCanvas2D.tsx`

### Phase 2 — Add missing opening type

**2.1 Add 'passage' opening type** — Add `'passage'` to `WallOpening['type']` union. Add presets (standard 0.9m, wide 1.2m, arch 0.8m). In 3D rendering, render only a frame (no panel, no glass). In 2D, render as a simple gap. Add "Passage" to the dock (or merge with Door dock as a style variant).

Files: `src/store/types.ts`, `src/lib/openingPresets.ts`, `src/components/build/Walls3D.tsx`, `src/components/build/InteractiveWalls3D.tsx`, `src/components/build/BuildModeV2.tsx`, `src/components/build/BuildCanvas2D.tsx`

### Phase 3 — Remove redundancy, improve consistency

**3.1 Remove Paint from bottom dock** — Remove the `paint` entry from `dockItems` array. Material editing is already accessible through the wall/room inspectors.

Files: `src/components/build/BuildModeV2.tsx`

**3.2 Enable furniture HA entity mapping** — Remove `opacity-50` and `disabled` from the HA entity input in `PropInspector`. Wire it up to save `haEntityId` on the prop via `updateProp`.

Files: `src/components/build/BuildInspector.tsx`

**3.3 Add furniture category selector** — In `PropInspector`, add a dropdown/button group for assigning categories (Sittmöbler, Förvaring, Belysning, etc.) to catalog items.

Files: `src/components/build/BuildInspector.tsx`

### Phase 4 — Scandinavian standards alignment

**4.1 Improve wall thickness defaults** — Change default thickness to 0.20m for exterior walls. Add an "Interior wall" preset at 0.10m in the wall inspector. When drawing walls, default to 0.15m (reasonable middle ground) but make it easy to switch.

Files: `src/components/build/BuildInspector.tsx`, `src/store/useAppStore.ts`

**4.2 Add M8 door preset** — Add standard Swedish M8 (0.8m × 2.1m) door to presets.

Files: `src/lib/openingPresets.ts`

**4.3 Fix `require()` to dynamic import** — Replace `require('../lib/roomDetection')` with `import('../lib/roomDetection')` in the room detection subscriber.

Files: `src/store/useAppStore.ts`

---

## Summary of changes by file

| File | Changes |
|------|---------|
| `src/store/types.ts` | Add `'passage'` to `WallOpening.type` union |
| `src/lib/openingPresets.ts` | Add passage presets + M8 door preset |
| `src/components/build/Walls3D.tsx` | Corner block material inheritance, flipped rendering, passage rendering |
| `src/components/build/InteractiveWalls3D.tsx` | Same as Walls3D |
| `src/components/build/BuildModeV2.tsx` | Remove Paint from dock, add Passage tool option |
| `src/components/build/BuildCanvas2D.tsx` | Reference controls visibility guard, passage 2D rendering |
| `src/components/build/BuildInspector.tsx` | Enable HA entity for props, add category selector, wall thickness presets |
| `src/store/useAppStore.ts` | Fix require() to import(), adjust default thickness |

