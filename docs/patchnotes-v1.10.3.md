# BJORQ v1.10.3 Patchnotes

Date: 2026-03-27

## Summary

`1.10.3` is a focused live-fix release after hands-on testing. It targets profile persistence, standby/home camera save flows, a build-mode crash, a harder project reset, and clearer Home overlay widgets.

## User-visible changes

- Theme and other profile-style settings now persist more reliably in hosted mode.
- Standby preview now saves the camera angle you actually chose in the preview card.
- Home camera mode now has a direct `Spara nu` action again and the saved view can be restored properly.
- Home overlay widgets are easier to read against the 3D scene.
- `Rensa allt` gives a much cleaner build reset by also clearing devices and robot/build mapping state.

## Technical changes

- Removed admin protection from the hosted `/api/profiles` save route so normal UI profile settings are not silently blocked.
- Wired `StandbySettingsPanel` to its own `DashboardPreview3D` camera ref instead of the shared scene camera ref.
- Updated `CameraFab` to save the current scene camera directly and use `flyTo(...)` when restoring a saved view.
- Hardened `clearAllFloors()` to also clear devices, vacuum mapping, reference drawings, kitchen fixtures, selection state, and home-screen device links.
- Restored missing dependencies in `VacuumMappingTools` that caused runtime failure in the build/device workspace.
- Strengthened the `overlay-widget` visual treatment for better contrast and readability.

## Verified

- `npm test`
- `npm run build`

## Recommended follow-up testing

- Hosted live test: change theme, reload, and confirm it remains.
- Save a standby camera angle, reload, and confirm `Sparad vy` still works.
- Save a Home start camera from the camera menu, reload, and confirm the app starts from that view.
- Confirm `Rensa allt` leaves no stale rooms, devices, or robot mappings before drawing again.
- Re-test room drawing after a full reset to see whether any remaining room-detection drift still exists.

## Known limitations

- Room creation/detection may still need a second focused pass if live retesting shows geometry drift after the new hard reset.
- Existing bundle/chunk warnings remain unchanged in the build output.
