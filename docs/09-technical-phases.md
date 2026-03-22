# Technical Phases

This document defines the current technical rollout for BJORQ after the hosted/add-on hardening work in `v1.8.1` and the settings cleanup in `v1.8.2`.

The goal is to keep Home Assistant add-on as the primary test environment while preserving feature parity across Windows and Linux hosted builds.

## Phase 1 - Security and Access Model

Status: In progress

Primary focus:
- Keep the hosted/add-on admin PIN model stable and predictable.
- Decide exactly which actions require admin unlock and which should remain available in normal dashboard use.
- Make the same rules apply across add-on, Windows, and Linux hosted mode.

Scope:
- Protect sensitive settings and server-side actions.
- Keep recovery simple by clearing the stored PIN hash in persistent server data.
- Avoid turning everyday dashboard use into a heavy login flow.

Definition of done:
- Sensitive routes are consistently guarded.
- The unlock model is understandable in the UI.
- Normal read/use flows remain smooth on tablet, phone, and wall display setups.

## Phase 2 - Hosted Live Sync and Reconnect

Status: In progress

Primary focus:
- Harden the new server-side Home Assistant live hub.
- Verify reconnect and multi-client behavior in real Home Assistant usage.

Scope:
- Initial snapshot and incremental state updates.
- Fallback polling only when the live path is degraded.
- Reconnect after Home Assistant restart or temporary network loss.
- Consistent behavior across add-on, Windows, and Linux hosted mode.

Definition of done:
- State updates arrive live without constant full polling.
- Two or more clients stay in sync against the same server.
- Reconnect behavior is stable and observable.

## Phase 3 - Backup, Restore, and Data Integrity

Status: Next

Primary focus:
- Make backup and import reliable enough for real migration and recovery.

Scope:
- Define exactly what a full hosted backup contains.
- Validate import payloads before writing to disk.
- Ensure restore survives server/add-on restart.
- Reduce edge cases around project, profile, and asset persistence.

Definition of done:
- Export/import works for real project data.
- Restored data survives restart.
- Error states are clear when backup content is incomplete or invalid.

## Phase 4 - Settings and Graphics Structure

Status: Next

Primary focus:
- Remove remaining duplication and overlap in `Inställningar` and `Grafik & Miljö` without changing the product's visual identity.

Scope:
- Clarify responsibility between sections like system, connection, data, graphics, and standby.
- Keep all existing camera and preview workflows intact.
- Improve navigation and grouping without introducing explanatory filler copy.

Definition of done:
- Fewer duplicated controls or repeated concepts.
- Important 3D preview and standby camera actions remain obvious.
- The pages feel more like a coherent app workspace than a long settings document.

## Phase 5 - Tests, CI, and Release Confidence

Status: Ongoing

Primary focus:
- Make releases safer by expanding automated coverage around hosted logic.

Scope:
- Auth tests.
- Live sync and reconnect tests.
- Backup and restore tests.
- Storage and route protection tests.
- CI parity for lint, test, and build.

Definition of done:
- Core hosted flows are covered by repeatable tests.
- CI reflects the actual minimum quality bar before release.

## Working Rules

- Add-on first for validation, but no platform-specific product behavior unless absolutely necessary.
- UI cleanup should improve structure, not trigger a visual redesign unless explicitly planned.
- Every release should leave behind both a changelog entry and a dedicated patchnotes file.
- Patchnotes should describe what changed, what was verified, and what still needs testing.
