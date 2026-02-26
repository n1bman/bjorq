

# Fix Media Player Sync Loop and Command Spam

## Root Cause

Three interconnected issues cause the "stuck" feeling and command spam:

### 1. `fromHA` flag race condition
`updateHALiveState` sets `fromHA = true`, then resets it via `queueMicrotask`. But Zustand's `subscribe` callback may fire AFTER the microtask resolves, so the bridge sees `fromHA === false` and sends commands back to HA, creating a loop.

### 2. No deep comparison in bridge
The bridge checks `newState !== oldState` (reference equality). Since `updateHALiveState` always creates new objects, every HA echo triggers `sendHACommand` even when values are identical.

### 3. Media player sends volume on every state change
The `media_player` case in `sendHACommand` always calls `volume_set` alongside play/pause/stop. Console logs show `volume_set` firing 4+ times in a row. This resets volume on the device, which echoes back, which triggers another round.

## Changes

### `src/hooks/useHABridge.ts`

**Replace `fromHA` flag with a counter-based approach:**
- Use `let fromHADepth = 0` instead of a boolean. `setFromHA(true)` increments, `setFromHA(false)` decrements. Check `fromHADepth > 0`. This survives microtask timing issues.

**Add deep comparison for media_player and other domains:**
- Before calling `sendHACommand`, compare `JSON.stringify(oldState.data)` vs `JSON.stringify(newState.data)`. Skip if identical. Strip transient fields (`_action`, `_3dOnly`, `progress`) before comparing.

**Fix media_player command logic:**
- Only send `volume_set` if volume actually changed (compare with previous state).
- Only send `media_play`/`media_pause` if state actually changed.
- Don't send volume alongside action commands (`_action` like stop/next/previous).
- When state is `idle` or `off` from HA echo, don't send any command back.

### `src/store/useAppStore.ts`

**Skip redundant state updates in `updateHALiveState`:**
- Before creating new `deviceStates` entry, compare the mapped state's `data` with existing. If identical, don't update `deviceStates` — this prevents unnecessary bridge triggers.

## File Summary

| File | Change |
|------|--------|
| `src/hooks/useHABridge.ts` | Counter-based fromHA, deep comparison, fix media_player volume spam |
| `src/store/useAppStore.ts` | Skip redundant deviceState updates in `updateHALiveState` |

