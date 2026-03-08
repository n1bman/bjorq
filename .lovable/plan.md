

## Plan: Furniture catalog UX improvements

### Issues identified

1. **PropInspector not scrollable** — The inspector panel (`w-56`, absolute positioned) has no max-height or overflow scroll, so tall content (name, stats, position, rotation, scale, material, HA, category, delete button) gets cut off on smaller screens.

2. **No instance count in catalog** — The left-side catalog cards don't show how many of each model are placed on the current floor.

3. **No edit/delete from catalog panel** — Users can't manage placed instances from the furniture side panel; they must click each one in the scene.

4. **Always places at (0,0,0)** — `placePropFn` hardcodes `position: [0,0,0]`. Should place at camera center or a visible location.

5. **No optimization verification** — Performance stats exist in the inspector but there's no clear "before/after" or verification indicator.

### Changes

**`src/components/build/BuildInspector.tsx`** — PropInspector (line 511)

- Add `max-h-[calc(100vh-6rem)] overflow-y-auto` to the root div so users can scroll the full inspector on any screen size.

**`src/components/build/BuildModeV2.tsx`** — AssetCatalog section

- **Instance count badges**: In the catalog card rendering (line 287), count how many props on the current floor use each `catalogId` and show a badge (e.g., "×2") on each card.

- **Placed items list at bottom of catalog**: After the grid (line 310), add a "Placerade" section listing placed props for the current floor with name, select button, and delete button — similar to the device panel pattern (lines 633-655).

- **Smart placement position** (line 202-204): Instead of `[0,0,0]`, calculate a position based on the camera/viewport center. Use the store's camera reference or a simple offset from the last placed prop to avoid stacking at origin.

- **Optimization verification**: Add a small summary at the bottom of the import dialog showing a clear verdict: green checkmark for OK models, yellow warning for heavy, red alert for too-heavy, with specific advice ("OK för Raspberry Pi" / "Kan vara trög på mobil").

### File summary
- `src/components/build/BuildInspector.tsx` — make PropInspector scrollable
- `src/components/build/BuildModeV2.tsx` — instance counts on cards, placed items list, smart placement, optimization feedback

