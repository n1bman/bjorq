# BJORQ v1.10.2 Patchnotes

Date: 2026-03-27

## Summary

`1.10.2` is a release focused on stabilizing the real Home Assistant path before broader live testing. The goal is to make hosted mode, Home layout persistence, and robot/vacuum sync behave more predictably across reloads and real HA data.

## User-visible changes

- Home layout data survives hosted reloads more reliably, including freer widget placement on the Home screen.
- The Home layout editor syncs less aggressively while dragging, which reduces noisy hosted writes during positioning.
- Vacuum controls behave more consistently when sent through Home Assistant, especially in the newer hosted/add-on path.
- Vacuum mapping now leans more clearly on modeled rooms and stable room links instead of older free-form robot-zone behavior being the primary path.

## Technical changes

- Hardened hosted bootstrap and persistence for `homeView` and `homeScreenDevices`.
- Added safer room and vacuum state reconciliation in the store so room-linked mappings survive rename/update flows better.
- Hardened direct Home Assistant service calls and vacuum room sync behavior in both `DEV` and `HOSTED`.
- Preserved vacuum UI-only fields correctly across HA live updates.
- Added local hosted mock tooling and fixture data for multi-vacuum/segment-map verification.
- Hardened BOM-prefixed JSON reading and adjusted Roborock map parsing to match real Home Assistant `service_response` payloads.

## Verified

- `npm test`
- `npm run build`
- Hosted bootstrap locally with seeded project data
- Real Home Assistant bootstrap and live snapshot against `vacuum.s5_max`
- Real segment map read via `roborock.get_maps`

## Recommended follow-up testing

- Live UI test on tablet/web against the current `main`
- Vacuum flow: clean room A, then clean room B without losing sync
- Check whether any remaining legacy free robot-zone flows should be removed or hidden
- Validate Home layout behavior across desktop, tablet, and future phone-oriented breakpoints

## Known limitations

- The room-to-room vacuum chain still needs focused live verification in the real UI flow.
- Legacy free robot-zone logic may still exist in parts of the build UI and should not be treated as the main product path.
