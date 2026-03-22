# BJORQ Dashboard v1.8.4

Release date: 2026-03-22

## Focus

This release is a targeted hosted/add-on test release for project persistence, autosave, and explicit save behavior in Design mode.

## What's fixed

### Hosted autosave
- Hosted project sync now becomes active immediately after bootstrap finishes applying server state.
- This removes the startup gap where early design changes could remain only in memory and disappear after reload.

### Manual project save
- `Spara projekt` in both Design mode and Settings now performs a real server-side save in hosted/add-on mode.
- The save action no longer depends on an indirect activity-log update to try to trigger autosave.

### Better feedback
- Hosted save failures now show an explicit error toast instead of silently failing behind a success message.

## Verification
- `npm test`
- `npm run lint`

## Recommended Home Assistant test
1. Open the add-on.
2. Draw walls or import a model in Design mode.
3. Wait 2-3 seconds without pressing save and reload the page.
4. Repeat with `Spara projekt` to confirm both autosave and explicit save paths behave correctly.
