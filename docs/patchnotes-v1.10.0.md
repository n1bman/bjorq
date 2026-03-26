# Patchnotes - v1.10.0

**Date:** 2026-03-26  
**Type:** Major widget system overhaul + quality-of-life fixes

---

## Summary

This release rebuilds the home screen widget system from the ground up. Every device is now an individually placeable card with inline controls instead of a shared pill-bar. Scenes become first-class widgets with icon color customization. The layout editor gains a reset button, safezone warnings, and support for dragging all overlay elements. Nordic Noir becomes the default theme, and several visual and persistence bugs are resolved.

## User-visible changes

- **Individual device widgets** — vacuum, TV, speaker, climate, light, and fan are each a separate card with inline controls (volume, brightness, temperature, zones). No more expanding popups.
- **Scene widget** — saved scenes render as a draggable widget on the home screen with proper icons and custom colors.
- **Scene icon color picker** — choose a color for each scene's icon in the scene editor; the color follows the icon everywhere (home screen, dashboard grid, room detail panel).
- **Layout editor improvements** — reset button to restore default positions, safezone warning when placing widgets behind the config panel, marker picker and layout button are now draggable.
- **Nordic Noir default** — fresh installations start with the Nordic Noir theme and warm gold accent.
- **Extended drag bounds** — widgets can be placed closer to screen edges (y up to 92%).

## Technical changes

- `HomeView.tsx` — replaced device pill-bar with individual absolute-positioned device cards using inline expand patterns.
- `HomeLayoutEditor.tsx` — added marker picker + layout button as draggable elements, reset functionality, safezone detection, higher z-index during drag.
- `DeviceMarkers3D.tsx` — synced `LightMarkerLightOnly` color logic with `LightMarker` so hide/show markers no longer alters lighting.
- `ThemeCard.tsx` — border visibility slider now sets explicit `borderColor` alongside opacity.
- `useAppStore.ts` — default theme changed to `nordic`; `partialize` strips transient prop fields to reduce localStorage usage; try-catch wrapping on persistence.
- `DashboardGrid.tsx` / `RoomDetailPanel.tsx` / `ScenesWidget.tsx` — scene `iconColor` propagated to all render sites.
- `types.ts` — `iconColor?: string` added to `SavedScene`.

## Verified

- `npm run build` passes
- Widget drag in layout mode: no jump on first move
- Scene icon color renders in ScenesPanel, ScenesWidget, DashboardGrid, RoomDetailPanel
- Hide/show device markers preserves light color state
- Border opacity slider sets correct color

## Recommended follow-up testing

- Test on tablet/kiosk hardware with many devices (localStorage quota)
- Verify layout positions persist across reload in hosted mode
- Test scene icon color with HA-linked scenes
- Check standby mode transition with new widget positions

## Known limitations

- `DashboardPreview3D` creates a separate WebGL context; running alongside `PersistentScene3D` uses more GPU memory
- Terrain data (trees, grass) is not included in localStorage persistence (intentional — re-generated on load)

---

## Checklist before release

- [x] Version bumped in app, server, and add-on config
- [x] `CHANGELOG.md` updated
- [x] Patchnotes file created
- [x] Real verification notes added
- [ ] GitHub release text prepared if needed
