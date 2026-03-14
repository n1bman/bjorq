

# Fix: Kitchen Template Rework

## Problems identified
1. **Build error**: `KitchenFixture3D` file not resolving — need to rewrite the file fresh
2. **Mallar tab wrong purpose**: Currently shows room templates (Sovrum, Kök, etc.) — user wants Mallar to contain ready-made 3D objects only, not room creation (that belongs under "Rum")
3. **Kitchen orientation**: Cabinets face outward (z=0 front) but should face toward the wall (back side open, front against wall)
4. **Kitchen layout issues**: Missing proper fridge, last section broken

## Changes

### 1. `src/components/build/KitchenFixture3D.tsx` — Rewrite file
- Fix build error by rewriting the full file
- **Flip orientation**: All cabinet fronts/handles currently at z≈0 should be at z≈-BASE_D (facing away from wall). The back of the cabinets (flat panels) should be at z=0 (against the wall). This means the kitchen "opens" toward the room, not toward the wall.
- Fix layout left-to-right: Skafferi (tall pantry) → Kylskåp (fridge with small cabinet above) → Spis/ugn with fläkt → Diskmaskin → Diskbänk med kran → Lådskåp
- Adjust widths to sum to 3.80m total

### 2. `src/components/build/structure/TemplatesPicker.tsx` — Convert to 3D object picker
- Remove all room template categories and room-creation logic
- Replace with a list of placeable 3D objects (starting with "Standardkök")
- Clicking places a `KitchenFixture` on the active floor at origin
- No room creation — just the 3D kitchen object

### 3. `src/lib/roomTemplates.ts` — Keep room templates for Rum functionality
- Remove the `fixture` field and `tpl-kitchen-standard` entry (kitchen is now a standalone 3D object, not a room template)
- Room templates stay available for the Rum feature but are no longer shown in Mallar

### 4. `src/store/types.ts` — Minor cleanup
- Remove `fixture?: string` from `RoomTemplate` interface (no longer needed)

## Kitchen layout (revised, 3.80m total)

```text
Left → Right:
┌────────┬──────┬──────┬──────┬────────┬──────┐
│Skafferi│Kylsk.│ Spis │Disk- │ Disk-  │ Låd- │
│  0.50  │ 0.60 │ 0.60 │mask. │ bänk   │ skåp │
│ h=2.40 │h=2.10│      │ 0.60 │  0.80  │ 0.60 │
│        │+0.30 │      │      │        │      │
│        │ top  │      │      │        │      │
└────────┴──────┴──────┴──────┴────────┴──────┘
Total: 0.50 + 0.60 + 0.60 + 0.60 + 0.80 + 0.60 = 3.70m (+0.10 filler)
```

Orientation: origin at bottom-center, cabinets open toward -Z (into room), backs at Z=0 (wall).

## Files touched
1. `src/components/build/KitchenFixture3D.tsx` (rewrite)
2. `src/components/build/structure/TemplatesPicker.tsx` (convert to 3D object picker)
3. `src/lib/roomTemplates.ts` (remove fixture field)
4. `src/store/types.ts` (remove fixture from RoomTemplate)

