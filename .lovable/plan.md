

# Standardkök — Procedural Kitchen Template

## Approach
Follow the existing **Stairs3D pattern**: store kitchen fixtures on the Floor, render them as procedural box geometry, place via TemplatesPicker. No GLTF models, no new abstraction layer.

## Changes

### 1. `src/store/types.ts`
- Add `KitchenFixture` interface:
  ```typescript
  export interface KitchenFixture {
    id: string;
    floorId: string;
    position: [number, number]; // x, z (bottom-center)
    rotation: number; // radians
  }
  ```
- Add `kitchenFixtures: KitchenFixture[]` to `Floor` interface (alongside `stairs`)

### 2. `src/store/useAppStore.ts`
- Add `addKitchenFixture(floorId, fixture)` and `removeKitchenFixture(floorId, id)` actions (same pattern as `addStair`/`removeStair`)
- Include in undo snapshots

### 3. `src/lib/roomTemplates.ts`
- Add new template entry:
  ```
  { id: 'tpl-kitchen-standard', name: 'Standardkök', width: 3.8, depth: 3, category: 'kitchen', fixture: 'standard-kitchen' }
  ```
- Add optional `fixture?: string` to `RoomTemplate` type

### 4. `src/components/build/structure/TemplatesPicker.tsx`
- When placing a template with `fixture === 'standard-kitchen'`, also call `addKitchenFixture` to spawn the kitchen along the back wall of the new room (z = -depth/2 + 0.3)

### 5. `src/components/build/KitchenFixture3D.tsx` (new, ~250 lines)
Procedural low-poly kitchen using `<mesh>` + `<boxGeometry>`. All dimensions from the prompt:

```text
Left → Right (3.80m total):
┌────────┬──────┬──────┬────────┬──────┐
│  Tall  │Stove │Dish- │  Sink  │Drawer│
│ Fridge │ 0.60 │wash. │  0.80  │ 0.60 │
│  0.60  │      │ 0.60 │        │      │
│ h=2.10 │      │      │        │      │
│+top cab│ h=0.87│h=0.87│ h=0.87│h=0.87│
└────────┴──────┴──────┴────────┴──────┘

Upper cabs: h=0.80, depth=0.30, mounted at y=1.40
Range hood: 0.60×0.10×0.35 above stove
Countertop: 3.20×0.04×0.62 at y=0.90
```

Colors (matching reference):
- Cabinets: `#f5f0e8` (warm white)
- Wood trim/edges: `#c8a86e` (light wood)
- Countertop: `#c8a86e` (light wood)
- Sink: `#b8bcc0` (metal, metalness 0.5)
- Appliances: `#e8e4de` (off-white)
- Handles: `#c8a86e` (wood knobs)

~25 mesh boxes total, well under 3000 triangles.

### 6. `src/components/build/BuildScene3D.tsx`
- Import and render `<KitchenFixture3D />` alongside `<Stairs3D />` (line ~293)

### Selection & deletion
Kitchen fixtures selectable via existing select tool. Click sets `selection.type = 'kitchen-fixture'`, Delete key removes it. Add `'kitchen-fixture'` to `BuildSelection.type` union.

## Files touched
1. `src/store/types.ts`
2. `src/store/useAppStore.ts`
3. `src/lib/roomTemplates.ts`
4. `src/components/build/structure/TemplatesPicker.tsx`
5. `src/components/build/KitchenFixture3D.tsx` (new)
6. `src/components/build/BuildScene3D.tsx`

