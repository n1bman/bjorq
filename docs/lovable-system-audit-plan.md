# Lovable System Audit Plan

Datum: 2026-03-26
Repo: `n1bman/bjorq`
Version vid genomgang: `1.9.1`

## Syfte

Den har planen ar en handoff till Lovable for att ga igenom hela BjorQ-systemet efter flera manuella och GitHub-baserade andringar utanför Lovable-flodet. Malet ar inte en stor refaktor, utan en metodisk genomgang som:

- sakerstaller att alla menyer och paneler ar kopplade till ratt state, API och backendfloden
- verifierar att Home Assistant-sync, live-sync och fallback beter sig korrekt
- lagar vacuum-syncen igen och gor segment/rum-kedjan robust
- sakerstaller att tema, designval, standby, dashboard och 3D-vyer hanger ihop
- kontrollerar att Wizard/assets/modeller/thumbnails fungerar hela vagen
- lamnar repot i ett lage dar `lint`, `test`, `build` och `tsc` ar grona

## Nuvarande lage

Kontrollerade 2026-03-26:

- `npm run build` -> passerar
- `npm test` -> passerar
- `npm run lint` -> passerar med 46 warnings
- `npx tsc -p tsconfig.app.json --noEmit` -> faller

Aktuella blockerare innan djupare audit:

1. `src/components/build/BuildTopToolbar.tsx`
   `isHostedSync()` anvands utan import.
2. `src/components/home/cards/DataBackupCard.tsx`
   `deviceStates` ar typad som `Record<string, unknown>` i stallet for `Record<string, DeviceState>`.
3. `src/components/home/cards/HAConnectionPanel.tsx`
   `statusConfig` saknar `degraded` trots att `HAConnectionStatus` innehaller den statusen.
4. `src/test/*.test.ts`
   testerna importerar `server/*.js` utan typdeklarationer.
5. `src/test/haMenuSelectors.test.ts`
   test-state castas direkt till `AppState` i stallet for `unknown as AppState`.

## Viktiga systemytor

### 1. App shell, lagring och mode-detektering

Relevanta filer:

- `src/lib/apiClient.ts`
- `src/store/useAppStore.ts`
- `src/pages/Index.tsx`
- `server/api/bootstrap.js`
- `server/api/config.js`
- `server/api/projects.js`

Att verifiera:

- HOSTED vs DEV-mode detekteras ratt
- bootstrap laddar profiler, projekt, config och auth-status korrekt
- save/export/import/reset fungerar i ratt lagringslager
- menyval och app-mode persistar och laddas tillbaka korrekt

### 2. Home Assistant-anslutning och live-sync

Relevanta filer:

- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `src/components/home/cards/HAConnectionPanel.tsx`
- `src/lib/haMenuSelectors.ts`
- `server/api/live.js`
- `server/api/haProxy.js`
- `server/ha/liveHub.js`

Att verifiera:

- direkt websocket i DEV
- SSE + snapshot + fallback poll i HOSTED
- reconnect-logik och statusovergangar: `disconnected`, `connecting`, `connected`, `degraded`, `error`
- att entiteter, liveStates och vacuumSegmentMap uppdateras konsekvent
- att adminkrav pa service-anrop fungerar for kansliga domainer

### 3. Vacuum-sync och rumsstyrning

Relevanta filer:

- `server/ha/liveHub.js`
- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `src/components/home/cards/RobotPanel.tsx`
- `src/components/build/devices/VacuumMappingTools.tsx`
- `src/lib/vacuumGeometry.ts`

Riskbild:

- vacuum-segmentkartan genereras server-side via `roborock.get_maps`
- segment-ID anvands sedan i Build Mode, HA bridge och RobotPanel
- om namnnormalisering, refresh eller fallback bryts sa slutar rumsstädning fungera trots att grundkontakten mot HA lever

Krav i denna audit:

- verifiera att segmentkartan verkligen uppdateras efter connect, reconnect och snapshot
- verifiera att rumsnamn matchas robust mellan HA, rum i layouten och vacuum-zoner
- verifiera att `targetRoom -> segmentId -> app_segment_clean` fungerar
- verifiera fallback nar segment-ID saknas: tydligt UI, ingen tyst fail
- skapa minst ett testfall for `parseVacuumSegmentMap`
- skapa minst ett testfall for namnmatchning/segmentupplosning i vacuum-flodet

### 4. Wizard, asset-import och bibliotek

Relevanta filer:

- `src/lib/wizardClient.ts`
- `src/components/build/BuildModeV2.tsx`
- `src/components/home/cards/WizardConnectionPanel.tsx`
- `server/api/assets.js`

Att verifiera:

- Wizard-anslutning och katalogladdning
- thumbnails i Wizard-fliken
- import till lokalt bibliotek
- lokal persistens av thumbnail/model metadata
- backfill for gamla Wizard-assets

### 5. Tema, design, dashboard-layout och standby

Relevanta filer:

- `src/components/home/cards/ThemeCard.tsx`
- `src/components/home/cards/DisplaySettings.tsx`
- `src/components/home/DashboardGrid.tsx`
- `src/components/home/HomeView.tsx`
- `src/components/standby/StandbyMode.tsx`
- `src/components/standby/StandbyWidgets.tsx`
- `src/hooks/useThemeEffect.ts`

Att verifiera:

- tema, accentfarg och bakgrund slar igenom i hela appen
- dashboard-layout, widget-konfig och kategoriordning sparas och laddas tillbaka
- standby arver ratt visuella val och fungerar med idle-timer
- inga paneler ar "visuellt frikopplade" fran profil eller dashboard-settings

### 6. 3D, modeller, rendering och Build Mode

Relevanta filer:

- `src/components/PersistentScene3D.tsx`
- `src/components/build/BuildModeV2.tsx`
- `src/components/build/BuildCanvas2D.tsx`
- `src/components/build/Props3D.tsx`
- `src/components/build/ImportedHome3D.tsx`
- `src/components/devices/DeviceMarkers3D.tsx`

Att verifiera:

- modellimport, placering och sparning
- 2D/3D-vaxling och kamera-lagen
- att rum, vaggar, material, props och devices ar konsekventa mellan vyerna
- att panelval i Build Mode fortfarande styr riktig state efter senaste andringar

## Rekommenderad arbetsordning for Lovable

### Fas 1: Stabiliseringsbas

Mal:

- fa `tsc --noEmit` gron
- undvika att djupare audit sker ovanpa brutna typer

Gor:

1. Fixa de fem aktuella TypeScript-felen med minsta mojliga diff.
2. Kor:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npx tsc -p tsconfig.app.json --noEmit`
3. Skicka en kort status med vad som var verkliga fel vs tidigare brus.

### Fas 2: Integrationsaudit per doman

Mal:

- verifiera att UI, store, backend och live-data sitter ihop for varje huvudomrade

Ordning:

1. HA connection + live sync
2. Vacuum sync
3. Dashboard widgets + tema + standby
4. Wizard/assets/import
5. Build Mode + 3D/models

For varje doman ska Lovable:

- kartlagga entry points
- verifiera stateflow in och ut
- verifiera att panelen faktiskt har fungerande koppling till backend/store
- laga endast de konkreta brister som hittas
- lagga till eller justera test dar regressionsrisk ar hog

### Fas 3: Slutvalidering

Mal:

- sakerstalla att helheten hanger ihop

Krav:

- alla checks grona
- ingen känd meny/panel utan backing integration
- vacuum-flodet verifierat pa riktigt
- tydlig lista over kvarvarande risker, om nagon finns

## Specifik plan for vacuum-syncen

Detta ar hogsta funktionella riskomradet just nu.

Lovable ska kontrollera hela kedjan:

1. `server/ha/liveHub.js`
   - hur `refreshVacuumMap()` triggas
   - om den bor triggas fler ganger an bara efter full state
   - om `roborock.get_maps` svar tolkas robust
2. `src/hooks/useHomeAssistant.ts`
   - att `segment-map` event och snapshot alltid hamnar i store
   - att fallback poll inte tappar segmentdata
3. `src/components/build/devices/VacuumMappingTools.tsx`
   - att segmentval i UI alltid kan sparas
   - att namn och rum inte divergerar
4. `src/hooks/useHABridge.ts`
   - att `targetRoom` faktiskt blir ratt `segmentId`
   - att rumsnamn matchas robust och forutsagbart
5. `src/components/home/cards/RobotPanel.tsx`
   - att "stadar rum" och statusindikatorer visar verkligt lage

Acceptance for vacuum:

- roboten far korrekt segment-ID for ett rum
- rumsstädning gar att starta efter reconnect
- segmentkartan forsvinner inte vid degraded/fallback
- UI visar tydligt om segment-ID saknas

## Checklista for menyer och paneler

Lovable ska ga igenom alla paneler i Home/Dashboard/Build och markera per panel:

- har panelen en riktig datakalla
- har panelen en riktig skrivvag tillbaka
- sparas dess installningar
- laddas de tillbaka efter refresh
- fungerar den i HOSTED
- fungerar den i DEV
- fungerar den med tom data utan crash

Prioriterade paneler:

- HAConnectionPanel
- RobotPanel
- ThemeCard
- DisplaySettings
- ProjectManagerPanel
- DataBackupCard
- WizardConnectionPanel
- BuildTopToolbar
- Build inspector / import / bibliotek / devices

## Forvantat arbetssatt

Lovable ska:

- jobba i sma reviewbara diffar
- inte gora bred refaktor utan tydlig anledning
- utga fran `main` som sync-kalla
- verifiera varje del innan nasta del
- dokumentera verkliga buggar och verkliga fixar, inte bara "cleanup"

## Rekommenderad prompt till Lovable

Anvand denna prompt som start:

```text
Ga igenom hela BjorQ-systemet metodiskt efter manuella andringar utanfor Lovable-flodet.

Arbeta i sma diffar och utga fran att main ar source of truth.

Borja med att fa dessa checks grona:
- npm run lint
- npm test
- npm run build
- npx tsc -p tsconfig.app.json --noEmit

Nar typbasen ar stabil, gor en systemaudit av:
1. HA connection + live sync
2. vacuum sync och room/segment mapping
3. dashboard widgets, tema, display och standby
4. Wizard/assets/import/thumbnails
5. Build Mode, 2D/3D, model import och persistens

For varje omrade:
- kartlagg entry points
- verifiera dataflode UI <-> store <-> backend <-> HA/Wizard
- laga bara konkreta buggar
- lagg till test dar regressionsrisken ar hog

Extra fokus:
- vacuum syncen har varit trasig tidigare och maste verifieras end-to-end
- kontrollera att alla menyer/paneler som ska ha integration verkligen har det
- kontrollera att tema/designval slar igenom i hela appen
- kontrollera att live sync, fallback och reconnect beter sig korrekt

Slutleverans:
- alla checks grona
- lista over fixade buggar
- lista over kvarvarande risker
- kort sammanfattning av vilka paneler/integrationer som verifierats
```

## Outputkrav till Lovable

Varje delrapport bor innehalla:

- vad som verifierades
- vad som var brutet
- exakt vilka filer som andrades
- vilka checks som kordes
- om nagon risk eller osakerhet finns kvar

## Min bedomning

Systemet ar inte i "okontrollerat" lage, men det har en tydlig hardningsskuld:

- typbasen ar inte helt synkad med senaste andringar
- HA/vacuum-kedjan ar komplex nog att den maste verifieras medvetet
- Wizard och 3D floden ser funktionella ut men ar beroende av flera lager och bor ga igenom i ett sammanhallet pass

Ratt strategi ar darfor:

- stabilisera typerna
- audita integrationsytorna metodiskt
- fixa vacuum-syncen som prioritet
- avsluta med en helhetsverifiering
