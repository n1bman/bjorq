# BJORQ Issues And Fixes

Last updated: 2026-03-27

## Open High-Risk Areas

- Vacuum sync remains a high-risk integration seam until re-verified end to end.
- Hosted persistence can still drift from UI expectations because multiple product surfaces write state differently.
- Documentation can drift because product behavior, handoff notes, and release notes evolve in parallel.
- The enlarged Home layout/editor feature set in `1.10.0` increases regression risk around drag behavior, safe areas, persistence, and mobile/tablet interaction.
- Scene icon consistency was important enough to get a dedicated `1.10.1` fix, so scene icon mapping should be treated as a known drift-prone area.
- Light marker visibility and color behavior were recently fixed several times, which makes marker state vs 3D rendering another regression-prone seam.
- Need runtime verification that the new `homeScreenDevices` hosted profile sync behaves correctly after reload in `HOSTED`.
- Need runtime verification that hosted `homeView` normalization preserves newer widget defaults when older profile payloads are loaded.
- Need runtime verification that Home layout drag persistence now commits only after pointer release and still feels correct on tablet/touch.
- Per-device widget configuration appears partially disconnected from the newer free Home card rendering path.
- Need runtime verification that the new Home overlay anchoring keeps widgets within tablet/phone view bounds in practice.
- Need runtime verification that the new direct websocket service path now gives `DEV` robot commands the same failure semantics as `HOSTED`.
- Need runtime verification that hosted vacuum segment-map refresh now stays current after initial bootstrap and later vacuum state changes.
- Need browser-level runtime verification that per-marker vacuum room sync now picks the correct room source in multi-vacuum setups.
- Need explicit runtime verification of hosted fallback/degraded mode; the current local hosted mock covers connected-state flows, not stream-loss behavior.
- Need browser-level runtime verification that HA live mapping now preserves vacuum UI-only state while still reflecting true HA status changes.
- Need browser/touch verification for robot panels and home cards in the hosted mock workspace.
- Need one final browser-level pass on the local real-HA sandbox now that `vacuum.s5_max`, the room sensor, and the segment map are confirmed in hosted runtime.
- Need targeted runtime verification of sequential room-clean commands against the real Roborock path; previous user testing indicates the second room command after an initial clean may fail or desync.

## Confirmed Recent Fixes

- 2026-03-27: Local repo fast-forward synced to `origin/main` at `5213dd9`.
- 2026-03-27: Added project-specific Codex operating structure under `codex/`.
- 2026-03-27: Confirmed local baseline is now BJORQ `1.10.1`.
- 2026-03-27: Confirmed local `npm.cmd test` passes after sync.
- 2026-03-27: Confirmed local `npm.cmd run build` passes after sync, with remaining warnings about large chunks and mixed static/dynamic imports.
- 2026-03-27: Completed static verification pass on Home layout/editor changes after `1.10.x`.
- 2026-03-27: Completed static verification pass on HA/vacuum/robot flow differences between `DEV` and `HOSTED`.
- 2026-03-27: Added hosted `homeView` normalization during bootstrap and added hosted profile sync for `homeScreenDevices`.
- 2026-03-27: Added direct websocket await-path for robot commands in `DEV` so `RobotPanel` no longer treats fire-and-forget calls as successful by default.
- 2026-03-27: Changed Home layout dragging to use local draft positions during movement and commit persisted layout only on pointer release.
- 2026-03-27: Added safer Home overlay anchoring so right-, center-, and bottom-anchored widgets stay better within the viewport.
- 2026-03-27: Added hosted vacuum segment-map refresh scheduling after both initial snapshots and later primary-vacuum updates.
- 2026-03-27: Changed vacuum current-room sync to prefer per-vacuum HA room data and otherwise match a room sensor per marker instead of broadcasting one sensor to all vacuums.
- 2026-03-27: Added focused tests for vacuum room-source matching helpers in `useHABridge`.
- 2026-03-27: Allowed HA bridge command forwarding in hosted `degraded` mode so fallback polling can still drive service calls through the generic bridge.
- 2026-03-27: Added vacuum live-state merging so HA updates no longer wipe UI-only robot fields like `targetRoom`, `cleaningLog`, `showDustEffect`, and `vacuumSpeed`.
- 2026-03-27: Added a local hosted mock harness with seeded project data and multi-vacuum HA fixture for runtime verification without a live Home Assistant instance.
- 2026-03-27: Completed API-level hosted runtime verification for bootstrap, live snapshot, segment-clean room switching, fan-speed updates, and return-to-base transitions against the local hosted mock.
- 2026-03-27: Confirmed the real Home Assistant remote endpoint and token work from this workspace when network access is allowed.
- 2026-03-27: Confirmed real HA state currently includes `vacuum.s5_max`, `sensor.s5_max_nuvarande_rum`, and a readable Roborock room map via `roborock.get_maps`.
- 2026-03-27: Hardened `readJSON` so hosted config and profile files with a UTF-8 BOM no longer crash the server during bootstrap.
- 2026-03-27: Hardened vacuum segment-map parsing for real HA `service_response` payloads such as `service_response.vacuum.s5_max.maps`.
- 2026-03-27: Completed real hosted API-level verification against the local `data/local-ha` sandbox with `activeProjectId=home`, `vacuum.s5_max`, `sensor.s5_max_nuvarande_rum`, and a populated segment map for `Tvrummet`, `Köket`, `G3`, `Hallen/matta`, `Hallen`, `G2`, and `Sovrum`.

## Tracking Format

Use this file for:

- confirmed bugs
- confirmed fixes
- known risks that need verification

Do not use this file for vague ideas or future features. Put those in `BACKLOG.md`.
