

# Plan: Set default grid size to 0.1m and persist the setting

## Change

One line change in `src/store/useAppStore.ts` line 43:

Change `sizeMeters: 0.5` → `sizeMeters: 0.1`

The grid state is already managed via zustand with `persist` middleware, so once the user changes it, it will be saved. However, the **initial default** is currently 0.5m. Changing it to 0.1m means new sessions start with 0.1m.

**Note**: Users who already have a persisted store with 0.5m will keep that value (zustand persist won't overwrite existing state). This is correct behavior — it means the setting is already being saved, just the factory default was wrong.

## Files

1. **`src/store/useAppStore.ts`** line 43 — change default `sizeMeters` from `0.5` to `0.1`

