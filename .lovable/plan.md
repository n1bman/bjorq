

# Full System Audit — BJORQ Dashboard

Följer `docs/lovable-system-audit-plan.md` exakt, fas för fas.

---

## Fas 1: Stabiliseringsbas

### Steg 1 — Kör alla fyra checks och samla faktiska fel

Kör i ordning:
1. `npx tsc -p tsconfig.app.json --noEmit` — fånga alla TS-fel
2. `npm run lint` — samla warnings/errors
3. `npm test` — verifiera att alla tester passerar
4. `npm run build` — verifiera att produktionsbygget går igenom

### Steg 2 — Fixa faktiska TypeScript-fel

Audit-planen listar 5 kända blockerare. Min kodgranskning visar att alla 5 ser fixade ut i nuvarande kod:
- `isHostedSync` importeras redan i `BuildTopToolbar.tsx` (rad 21)
- `deviceStates` i `DataBackupCard.tsx` är redan `Record<string, DeviceState>` (rad 147)
- `statusConfig` i `HAConnectionPanel.tsx` har redan `degraded` (rad 30)
- Alla testfiler har `// @ts-ignore` för server JS-importer
- `haMenuSelectors.test.ts` använder redan `as unknown as AppState` (rad 58)

**Men** — eftersom tsc fortfarande faller måste vi köra kommandot, läsa exakt output, och fixa de verkliga felen. Möjliga orsaker:
- Nya filer tillagda utanför Lovable som inte typkollas korrekt
- Import-/typfel i mindre filer som inte granskats ännu
- `@types`-paket som saknas eller inte matchar

Varje faktiskt TS-fel fixas med minsta möjliga diff.

### Steg 3 — Bekräfta alla fyra checks gröna innan nästa fas

---

## Fas 2: HA + live-sync audit

**Filer att verifiera:**
- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `src/lib/apiClient.ts`
- `src/components/home/cards/HAConnectionPanel.tsx`
- `server/ha/liveHub.js`
- `server/api/live.js`

**Kedjan att verifiera:**

DEV-läge:
- `connect()` → WS → `auth_required` → `auth_ok` → `get_states` → `subscribe_events` → live updates
- `callService` → WS `call_service`
- `onclose` → reconnect med 5s backoff

HOSTED-läge:
- `useHomeAssistant()` effect → `fetchSnapshot()` → `connectHostedStream()` (EventSource `/api/live/events`)
- Events: `snapshot`, `entity-update`, `ha-status`, `segment-map`, `ping`
- Heartbeat: 45s timeout → `startFallback()` → poll var 10s → `scheduleStreamReconnect()`
- Service calls: `callHAService()` → `POST /api/live/service`
- `haServiceCaller.current` sätts korrekt i bägge lägen

**Statusövergångar:**
`disconnected` → `connecting` → `connected` / `error` / `degraded`

**Redan verifierat i kodgranskning:**
- Ingen WS auto-connect i hosted mode (guarded by `isHostedSync()` check)
- `applyHostedSnapshot()` sätter entities, liveStates, status, transport, vacuumSegmentMap
- Throttle via `createThrottledCaller` wired i bägge lägen

---

## Fas 3: Vacuum audit

**Filer:**
- `server/ha/liveHub.js` (`refreshVacuumMap`, `parseVacuumSegmentMap`)
- `src/hooks/useHomeAssistant.ts` (segment-map event, rad 275-278)
- `src/components/home/cards/RobotPanel.tsx` (`getZoneSegmentId`, `startRoomCleaning`)
- `src/components/build/devices/VacuumMappingTools.tsx`
- `src/store/types.ts` (VacuumZone, VacuumMapping)

**Kedjan att verifiera:**
1. Server: `liveHub.connect()` → gets states → finds `vacuum.*` → `refreshVacuumMap()` → `roborock.get_maps` → `parseVacuumSegmentMap()` → broadcast `segment-map`
2. Client: `segment-map` event → `setVacuumSegmentMap()` → `homeAssistant.vacuumSegmentMap`
3. RobotPanel: `getZoneSegmentId(zone)` → zone.segmentId || vacuumSegmentMap[roomName]
4. Om segmentId saknas → toast med tydlig feltext (rad 134-138)
5. `app_segment_clean` med `segments: [segId]`

**Redan verifierat i kodgranskning:**
- `parseVacuumSegmentMap` hanterar both array-of-rooms och object-keyed-rooms (rad 36-54)
- Namnmatchning är **case-sensitive** — notera som risk men inte kritisk bugg
- UI visar tydlig varning (`AlertCircle` + "Saknar segment-ID") om segmentId saknas
- Zone-data persisteras via `floor.vacuumMapping` i `layout` → inkluderat i `partialize` och project sync

**Test att lägga till:** `parseVacuumSegmentMap` har redan tester i `liveHub.test.ts`. Eventuellt utöka med fler edge cases.

---

## Fas 4: Persistence & sync audit

**Filer:**
- `src/store/useAppStore.ts` (partialize rad 1735-1779, syncProfileToServer rad 81-102, initHostedMode rad 1787-1868)
- `src/lib/apiClient.ts`
- `src/lib/projectIO.ts`
- `server/api/profiles.js`, `server/api/projects.js`, `server/api/bootstrap.js`

**Redan verifierat i kodgranskning — alla tre tidlgare buggarna är fixade:**
- `comfort` finns i `partialize` (rad 1764), `syncProfileToServer` (rad 99), och bootstrap (rad 1833)
- `performance` finns i `partialize` (rad 1756)
- `dashboard` finns i `partialize` (rad 1765)

**Sparflöden att verifiera punkt för punkt:**

| Data | DEV (localStorage) | HOSTED (server) |
|------|-------------------|-----------------|
| layout, devices, props, homeGeometry, terrain | partialize ✓ | syncProjectToServer ✓ |
| profile, performance, standby, homeView | partialize ✓ | syncProfileToServer ✓ |
| environment, customCategories, wifi, energyConfig | partialize ✓ | syncProfileToServer ✓ |
| calendar, automations, savedScenes, comfort | partialize ✓ | syncProfileToServer ✓ |
| wizard (url + version only), dashboard | partialize ✓ | syncProfileToServer ✓ |
| activityLog | partialize ✓ | buildHostedProjectPayload ✓ |
| homeAssistant (wsUrl + token only) | partialize ✓ | config via bootstrap ✓ |

**Backup/restore:** `ThemeBackupCard` exporterar/importerar tema, `DataBackupCard` hanterar full backup, `ProjectManagerPanel` hanterar projektfiler.

---

## Fas 5: Dashboard / tema / display / standby audit

**Filer:**
- `src/hooks/useThemeEffect.ts`
- `src/components/home/cards/ThemeCard.tsx`
- `src/components/home/cards/DisplaySettings.tsx`
- `src/components/standby/StandbyMode.tsx`
- `src/components/standby/useIdleTimer.ts`

**Att verifiera:**
- Tema-paletter (dark/midnight/light/nordic) sätter korrekta CSS-variabler
- Custom colors (8 st) appliceras och persisteras
- Saved themes sparas/laddas/tas bort
- Section accents (energy/climate/weather) renderas korrekt
- Standby: idle timer → enterStandby → exitStandby → fasövergångar
- Widget layout persistence

---

## Fas 6: Wizard / assets / import audit

**Filer:** `src/lib/wizardClient.ts`, `src/lib/catalogLoader.ts`, `src/lib/assetPipeline.ts`

**Att verifiera:**
- Wizard connection test → status → catalog fetch
- Thumbnail loading (URL construction, fallback)
- Model download → import → base64 persistence (< 4MB)
- `staleSync` handling

---

## Fas 7: Build Mode / 2D / 3D audit

**Filer:** `BuildModeV2.tsx`, `BuildCanvas2D.tsx`, `Props3D.tsx`, `DeviceMarkers3D.tsx`

**Att verifiera:**
- Wall drawing → room detection → room persistence
- Props placement → persist → reload
- Device marker placement → room auto-assignment → HA entity linking
- Material application
- Undo/redo
- Floor management
- Model import (GLB/GLTF)

---

## Fas 8: Slutvalidering

- Alla fyra checks gröna
- Lista över alla fixade buggar
- Lista över kvarvarande risker
- Sammanfattning av verifierade paneler/integrationer

---

## Arbetsordning

Faserna är sekventiella. Fas 1 (stabilisering) måste vara grön innan djupare audit. Varje fas levererar konkreta fynd och minsta möjliga fixar.

**Panel-checklista** (verifieras under respektive fas):
- HAConnectionPanel — datakälla, skrivväg, HOSTED/DEV
- RobotPanel — segment-ID chain, service calls
- ThemeCard — custom colors, saved themes, persistens
- DisplaySettings — all settings affect rendering
- ProjectManagerPanel — save/export/import
- DataBackupCard — full backup/restore/reset
- WizardConnectionPanel — connection + catalog
- BuildTopToolbar — tools, import, save

