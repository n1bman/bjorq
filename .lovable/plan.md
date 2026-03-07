

# Rename "Referens" to "Planritning" and add adjustment controls

## What changes

1. **Remove old "Planritning" button** from both `BuildModeV2.tsx` and `BuildCatalogRow.tsx` — this used `setFloorplanImage` which stored a raw image with no controls.

2. **Rename "Referens" to "Planritning"** in both files, keeping the `setReferenceDrawing` logic (which already supports opacity, scale, rotation, offset).

3. **Add a "Planritning" controls panel** that appears when a reference drawing is loaded. Controls:
   - **Opacitet** (0–1 slider)
   - **Skala / pixlar per meter** (slider + input)
   - **Rotation** (0–360 degrees)
   - **Position X/Y** offset
   - **Lås** toggle to prevent accidental moves
   - **Ta bort** button to clear the reference

   This panel will be added to `BuildInspector.tsx` or as a standalone floating panel visible when in 2D mode with a reference loaded.

## Files to edit

- `src/components/build/BuildModeV2.tsx` — Remove Planritning card, rename Referens to Planritning
- `src/components/build/BuildCatalogRow.tsx` — Same changes
- `src/components/build/BuildCanvas2D.tsx` — Add floating reference controls panel inline (opacity, scale, rotation, offset, lock, delete)

