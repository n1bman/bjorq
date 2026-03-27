# BJORQ Master Plan

Last updated: 2026-03-27

## Product Direction

- BJORQ is a 3D smart home dashboard.
- `Home` remains `3D-first`.
- The product must stay viable for web now, without blocking tablet and phone later.
- Home Assistant is the primary integration path today through the hosted/add-on model.
- Future optional integrations, including IKEA hub ideas, should be additive rather than breaking the HA-first architecture.
- Asset Wizard is a side project to BJORQ, not the main app. Its role is to help optimize 3D models and sync 3D model catalogs into the dashboard ecosystem.
- Build mode should remain the source of truth for room modeling: BJORQ rooms can be named freely, vacuum placement should bind the robot to those modeled rooms, and Home Assistant segment ids should be mapped onto those rooms so 3D visualization and room-clean commands stay aligned.

## Current Operating Priorities

1. Keep the local repo in sync with `origin/main` before larger implementation bursts.
2. Protect high-risk seams: DEV vs HOSTED, HA live sync, vacuum flows, hosted persistence, Wizard contracts.
3. Keep user-facing docs aligned with implementation as part of normal delivery.
4. Keep planning and bug tracking inside `codex/planning/` so context survives between sessions.

## Immediate Focus Areas

- harden Home layout persistence and responsive behavior after `1.10.x`
- harden HA/vacuum flows with explicit DEV vs HOSTED parity
- verify hosted persistence across product surfaces
- keep product UX aligned with the Nordic Noir and 3D-first direction
- reduce drift between code, docs, and handoff material

## Verified Impact After GitHub Sync

The sync to `5213dd9` changed what matters most right now:

- Home layout editing is now a core product surface, not a side feature
  - free-positioned widgets, free device cards, and draggable utility controls are now central to the Home experience
  - this makes persistence, upgrade migration, and tablet/phone behavior immediate delivery concerns
- HA vacuum control is usable, but parity between `DEV` and `HOSTED` is not yet strong enough
  - robot commands, segment-map lifecycle, fallback behavior, and multi-vacuum assumptions still have seam risk
- the next implementation work should start from confirmed seams, not generic polish
  - first priority is Home layout persistence/responsive hardening
  - second priority is HA vacuum parity and robot-state hardening
  - latest hardening now covers hosted Home persistence, drag/write behavior, viewport anchoring, DEV robot command semantics, hosted segment-map refresh, per-marker room sync heuristics, generic HA command forwarding in hosted degraded mode, and preservation of vacuum UI-only state during HA live updates
  - we now also have a local hosted mock harness for repeatable robot-flow runtime verification without real HA
  - we have now also confirmed that the real HA endpoint, token, vacuum entity, room sensor, and Roborock room map are available for end-to-end verification
  - real hosted runtime verification now confirms `activeProjectId=home`, `vacuum.s5_max`, room sensor state, and a populated segment map in BJORQ's own `/api/live/snapshot`

## Next Recommended Work Order

1. Verify Home layout editor and free widgets on tablet and phone widths with real interaction passes.
2. Finish browser-level hosted runtime verification on the local real-HA sandbox now that the real vacuum segment map is loading correctly.
3. Run a dedicated fallback/degraded verification pass before expanding robot features.
4. Investigate chained room-clean flows where a second room command after the first clean appears to desync or fail for the current Roborock path.
5. Keep tightening `DEV` vs `HOSTED` robot-command semantics only where product-facing behavior still drifts.
6. Continue hosted persistence verification across product surfaces after the latest Home fixes.

## Relevant GitHub Updates Since Previous Local Baseline

Local repo was synced on 2026-03-27 from `5526623` to `5213dd9`.

What materially affects continued work:

- Home layout editor and draggable home UI became much more central
  - free positioning and drag logic for widgets, nav, camera, room controls, and device/scenes cards were expanded heavily
  - this increases the importance of validating Home layout persistence, mobile/tablet behavior, and interaction polish
- Home view shifted further toward free-form device and scene widgets
  - this supports the product direction, but it also creates more state, layout, and UX edge cases to verify
- Scene icon consistency was actively fixed in `1.10.1`
  - this suggests icon/state mapping drift was real and should stay on the review radar when touching scenes
- Light marker visibility and color consistency were actively fixed
  - marker hide/show logic is still a sensitive seam between UI state and 3D rendering
- Robot and room-switching behavior received recent fixes
  - vacuum and robot flows remain high-risk and still need explicit end-to-end verification
- Version and release surface moved to `1.10.x`
  - docs, patchnotes, and release discipline need to stay aligned with the newer baseline

## Working Model

- main chat agent owns scope, synthesis, and final decisions
- use delegated specialists for bounded tasks
- use `codex/agents/` when spawning project-specific delegated work
- use `codex/skills/` for repeatable process work
