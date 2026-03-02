

## Plan: UI Refinements, Camera Fix, HA Audit, Changelog — v0.2.1

### Phase 1: UI Changes (3 files)

**1. Move device visibility picker to top-right** (`src/components/home/HomeView.tsx`)
- Remove the `fixed bottom-36 left-4` eye button
- Place it in the top-right area (e.g., `fixed top-5 right-5`) as a small glass-panel icon button
- Popup opens downward from the button instead of upward
- Keeps the same per-device toggle list with "Visa alla" / "Dölj alla"

**2. Shrink CameraStartSettings panel** (`src/components/home/cards/CameraStartSettings.tsx`)
- Remove the long description paragraph
- Make it a compact single-row layout: title + Save button + Reset button inline
- Show saved position as a subtle badge, not a full paragraph

**3. Fix camera not applying on navigation** (`src/components/Scene3D.tsx`)
- Bug: the CameraController effect at line 73 only fires when `appMode` changes AND `prevMode.current !== appMode`. This works for mode transitions but has a subtle issue: if the user saves a new start position while already on 'home', then navigates to 'dashboard' (which also passes the condition), `prevMode.current` is already 'home'/'dashboard' and the lerpingTo might not trigger correctly because both modes share the same condition group.
- Fix: Also trigger lerp when `customStartPos`/`customStartTarget` change while already on home/dashboard (provide immediate visual feedback after save). Add a separate effect that applies the saved position immediately when saving, independent of mode changes.

### Phase 2: HA Sync Audit (review only, fix where needed)

I'll audit `useHABridge.ts` against all supported domains. Current coverage:
- `light` — turn_on/off with brightness, color_temp, rgb_color ✓
- `switch` / `input_boolean` — turn_on/off ✓
- `climate` — set_hvac_mode, set_temperature ✓
- `lock` — lock/unlock ✓
- `vacuum` — start/stop/pause/return_to_base, fan_speed, segment clean ✓
- `media_player` — play/pause/stop, volume, next/prev, turn_off ✓ (now with idle volume fix)
- `fan` — turn_on/off, set_percentage ✓
- `cover` — open/close/stop, set_position ✓
- `scene` / `script` / `automation` — trigger ✓
- `alarm_control_panel` — arm/disarm with code ✓
- `water_heater` — temperature, operation_mode ✓
- `humidifier` — on/off, humidity, mode ✓
- `siren` — on/off with tone/volume ✓
- `button` — press ✓
- `number` / `input_number` — set_value ✓
- `select` / `input_select` — select_option ✓
- `valve` — open/close, set_position ✓
- `lawn_mower` — start/dock/pause ✓

Sync looks comprehensive. Potential issue to fix:
- `fan` calls both `turn_on` AND `set_percentage` — the `turn_on` already includes percentage. Remove the duplicate `set_percentage` call.

Widgets, standby, and build mode use the same `deviceStates` store so they share the sync pipeline.

### Phase 3: Changelog + Version Management (3 files)

**Create `CHANGELOG.md`** at project root using Keep a Changelog format:
- Document all changes from v0.1.0 through v0.2.0
- Going forward, every change session adds entries before bumping version

**Bump `package.json`** to `0.2.1`

**Update `docs/roadmap-vNext.md`** or create a development workflow note in `docs/08-developer-notes.md` documenting the versioning convention: bump version in `package.json` before each release tag push.

### Files Modified (6)
1. `src/components/home/HomeView.tsx` — move picker to top-right
2. `src/components/home/cards/CameraStartSettings.tsx` — compact layout
3. `src/components/Scene3D.tsx` — fix camera apply logic
4. `src/hooks/useHABridge.ts` — remove duplicate fan command
5. `CHANGELOG.md` — new file with full history
6. `package.json` — version 0.2.1

