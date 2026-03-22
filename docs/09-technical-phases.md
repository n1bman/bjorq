# Technical Phases

This document tracks the current technical rollout for BJORQ after the hosted/add-on hardening in `v1.8.1` and the settings cleanup in `v1.8.2`.

The main rule is still add-on first for validation, while Windows and Linux hosted builds should end up with the same feature set.

## Phase 1 - Security and Access Model

Status: Completed

Primary focus:
- Keep the hosted/add-on admin PIN model stable and predictable.
- Separate normal dashboard use from administrative actions.
- Apply the same protection rules across add-on, Windows, and Linux hosted mode.

Definition of done:
- Sensitive routes are consistently guarded.
- The unlock model is understandable in the UI.
- Normal read/use flows remain smooth on tablet, phone, and wall display setups.

## Phase 2 - Hosted Live Sync and Reconnect

Status: Completed

Primary focus:
- Harden the server-side Home Assistant live hub.
- Verify reconnect and multi-client behavior in real Home Assistant usage.

Definition of done:
- State updates arrive live without constant full polling.
- Two or more clients stay in sync against the same server.
- Reconnect behavior is stable and observable.

## Phase 3 - Backup, Restore, and Data Integrity

Status: Completed

Primary focus:
- Make backup and import reliable enough for real migration and recovery.

Definition of done:
- Export/import works for real project data.
- Restored data survives restart.
- Error states are clear when backup content is incomplete or invalid.

## Phase 4 - HA Menu Coverage and Entity Matching

Status: In progress

Primary focus:
- Make the HA-driven menus useful even when a home does not yet have every device category installed.

Scope:
- Centralize HA selectors so Energy, Climate, Automations, Scenes, Surveillance, and Robot use the same discovery rules.
- Surface HA entities even before they are fully placed in 3D.
- Improve design-time HA entity matching so suggested links feel more relevant than raw domain filtering.
- Keep existing 3D preview and standby camera workflows intact while menu coverage expands.

Definition of done:
- HA menus can represent both linked and future/unplaced entities more clearly.
- Entity matching in design mode feels more relevant than raw domain-only filtering.
- Missing climate, energy, surveillance, and robot hardware no longer makes those menus feel empty or unfinished.

## Phase 5 - Settings and Graphics Structure

Status: Deferred

Primary focus:
- Remove remaining duplication and overlap in `Inställningar` and `Grafik & Miljö` without changing the product's visual identity.

Definition of done:
- Fewer duplicated controls or repeated concepts.
- Important 3D preview and standby camera actions remain obvious.
- The pages feel more like a coherent app workspace than a long settings document.

## Phase 6 - Tests, CI, and Release Confidence

Status: Ongoing

Primary focus:
- Make releases safer by expanding automated coverage around hosted logic and HA menu behavior.

Scope:
- Auth tests.
- Live sync and reconnect tests.
- Backup and restore tests.
- Storage and route protection tests.
- HA selector and HA menu coverage tests.
- CI parity for lint, test, and build.

Definition of done:
- Core hosted flows are covered by repeatable tests.
- HA menu selectors and entity matching rules have targeted tests.
- CI reflects the actual minimum quality bar before release.

## Working Rules

- Add-on first for validation, but no platform-specific product behavior unless absolutely necessary.
- UI cleanup should improve structure, not trigger a visual redesign unless explicitly planned.
- Every release should leave behind both a changelog entry and a dedicated patchnotes file.
- Patchnotes should describe what changed, what was verified, and what still needs testing.
