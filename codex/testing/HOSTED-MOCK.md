# Hosted Mock

Last updated: 2026-03-27

## Purpose

Use the local hosted mock when we need a repeatable BJORQ runtime sandbox without a live Home Assistant instance.

It exists to verify:

- hosted bootstrap and persisted project loading
- live snapshot consumption in hosted mode
- vacuum and robot command flows
- multi-vacuum room-sync behavior
- regressions across `HOSTED` without depending on Lovable-era `DEV`

## Commands

From [`bjorq-git`](/C:/Users/anton/Desktop/smart%20hem%202026/BJORQ%20DASHBOARD/01%20-%20BjorQ%20dashboard/00%20-%20Active%20repo/bjorq-git):

```powershell
npm.cmd run hosted:mock:setup
npm.cmd run hosted:mock
```

Default behavior:

- seeds data into `data/mock-hosted`
- starts the server on `http://localhost:3100`
- loads `server/fixtures/ha-multi-vacuum.json`

## What The Mock Includes

- one hosted project: `home`
- two vacuum markers:
  - `vacuum.roborock_s8`
  - `vacuum.roborock_qrevo`
- room sensors per vacuum:
  - `sensor.roborock_s8_current_room`
  - `sensor.roborock_qrevo_current_room`
- a shared first-pass segment map for:
  - `Kok`
  - `Hall`
  - `Vardagsrum`
  - `Kontor`

## Current Limits

- this is a hosted verification harness, not a full Home Assistant emulator
- segment-map behavior is still intentionally simplified and global-first
- degraded/fallback behavior still needs separate runtime verification
- browser/touch verification is still separate from API-level verification

## Verified On 2026-03-27

API-level runtime verification against the hosted mock confirmed:

- `/api/bootstrap` loads the seeded `home` project
- `/api/live/snapshot` returns `connected` state with two vacuum entities
- `vacuum.send_command` with `app_segment_clean` updates robot state and room sensor
- `vacuum.set_fan_speed` updates live vacuum attributes
- `vacuum.return_to_base` updates robot state to `returning`

Real Home Assistant verification on 2026-03-27 confirmed:

- the configured remote endpoint is reachable from this workspace when network escalation is allowed
- the token returns live HA state successfully
- the current live setup exposes:
  - `vacuum.s5_max`
  - `sensor.s5_max_nuvarande_rum`
- `roborock.get_maps` returns room mapping for:
  - `Tvrummet`
  - `Köket`
  - `G3`
  - `Hallen/matta`
  - `Hallen`
  - `G2`
  - `Sovrum`
- the local real-HA hosted sandbox in `data/local-ha` now boots successfully through BJORQ's own server
- `GET /api/bootstrap` returns `activeProjectId: home`
- `GET /api/live/snapshot` reaches `connected` with:
  - `vacuum.s5_max`
  - `sensor.s5_max_nuvarande_rum`
  - room sensor state `Tvrummet`
  - populated segment map for `Tvrummet`, `Köket`, `G3`, `Hallen/matta`, `Hallen`, `G2`, and `Sovrum`
- no physical robot commands were sent during this verification pass; only state reads and map reads were used

## Runtime Notes

- hosted config files created through some Windows/PowerShell flows may include a UTF-8 BOM; `readJSON` is now tolerant of that so local hosted boot no longer crashes on BOM-prefixed JSON
- real Roborock map reads currently arrive as `service_response.<entity_id>.maps`, and `parseVacuumSegmentMap` is now aligned with that payload shape

## Secret Handling

- real HA credentials should live only in ignored local data, not tracked project files
- `.gitignore` now excludes `data/*` while preserving `data/.gitkeep`
- use `data/local-ha` for real integrations and `data/mock-hosted` for local mock runs
