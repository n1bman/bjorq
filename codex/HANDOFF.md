# Codex Handoff

Datum: 2026-03-27
Projekt: `BJORQ Dashboard`
Repo: `C:\Users\anton\Desktop\smart hem 2026\BJORQ DASHBOARD\01 - BjorQ dashboard\00 - Active repo\bjorq-git`
Branch: `main`

## Syfte med denna handoff

Denna fil ar till nasta Codex-agent sa att arbetet kan fortsatta utan att nagon behover gissa vad som har hant, vad som ar klart, vad som ar pushat och vad anvandaren vill prioritera.

## Viktig anvandarkontext

Anvandaren vill att systemet ska vara stabilt, produktnara och konsekvent mellan alla delar.

Viktigaste nuvarande mal:

- hela systemet ska granskas och hardas ordentligt
- alla menyer och paneler ska ha riktiga integrationer
- alla sparningsfunktioner ska fungera och verifieras
- Home Assistant-sync ska vara mycket stabil
- vacuum-syncen ar extra prioriterad och maste verifieras/fixas igen
- tema, design, live-sync, standby, dashboard, Wizard, 3D och modeller ska hanga ihop

Anvandaren vill ocksa kunna ta over arbetet mellan flera Codex-agenter, darav denna handoff.

## Det vi har gjort i denna period

### 1. Legacy-stod for gammal iPad / Safari

Gjort tidigare i denna trad:

- lagt in legacy-build via `@vitejs/plugin-legacy`
- mjukat upp fallbacken kring "JS bundle did not load after 5s"
- markerat appen som bootad sa fallbacken inte triggar i onodan

Detta slapptes som:

- `v1.9.0`
- commit: `0acb39d`

### 2. Wizard-thumbnails fix

Gjort tidigare i denna trad:

- normaliserat Wizard-thumbnail-flodet mot riktig thumbnail-endpoint
- lagt till retry/fallback i bibliotekskort
- persisterat thumbnails lokalt vid import
- lagt till backfill for gamla Wizard-assets

Detta slapptes som:

- `v1.9.1`
- commit: `c8afd8a`

Relaterad dokumentation:

- `docs/patchnotes-v1.9.1.md`
- `CHANGELOG.md`

### 3. Lovable-audit plan skapad och pushad

En konkret handoff-plan for Lovable skapades och pushades till repot:

- fil: `docs/lovable-system-audit-plan.md`
- commit: `5526623`

Denna plan kom till efter att Lovable forst gav en alltför snabb och tunn "full audit" som inte matchade den faktiska statusen i repot.

## Viktigt om Lovable-laget

Lovable gav forst en rapport som sag ut att ha gatt for fort och inte matchade repot. Den rapporten pagav bland annat att hela auditkedjan var klar i ett svep och att `tsc` var gron, trots att den da inte var det i var lokala kontroll.

Efter detta:

- en riktig audit-plan skrevs
- planen pushades till repot
- anvandaren instruerades att tvinga Lovable att folja `docs/lovable-system-audit-plan.md`

Notera:

- sedan dess har fler commits kommit pa `main` fran annat hall, bland annat:
  - `e615a8d` Fixed comfort and dashboard sync
  - `67cacbe` Set up phased system audit tasks
  - `0d35271` Save plan in Lovable
  - `8ceca8c` Polished UI with Lucide icons

Det betyder att nasta agent maste utga fran nuvarande repo, inte fran gamla antaganden.

## Senast verifierad teknisk status

Verifierat lokalt 2026-03-27:

- `npx tsc -p tsconfig.app.json --noEmit` -> passerar
- `npm test` -> passerar
- `npm run build` -> passerar
- `npm run lint` -> passerar med warnings

Detaljer:

- lint ar gron men med 47 warnings, huvudsakligen React hook-deps / fast-refresh-varningar
- build ar gron men har stora chunk-varningar och dynamic/static import-varningar
- build-chunks ar fortfarande stora, vilket ar relevant for gamla iPads och framtida Pi/streaming-tankar

## Kanda tekniska risker just nu

### 1. Vacuum-sync

Detta ar fortfarande den viktigaste funktionella riskytan.

Berorda lager:

- `server/ha/liveHub.js`
- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `src/components/home/cards/RobotPanel.tsx`
- `src/components/build/devices/VacuumMappingTools.tsx`

Det som maste sakerstallas:

- segment-map laddas och uppdateras robust
- reconnect och fallback tappar inte vacuum-data
- `targetRoom -> segmentId -> app_segment_clean` fungerar
- namnmatchningen mellan rum, zoner och HA-svar ar robust
- UI visar tydlig fallback om segment-ID saknas

### 2. Integrationer mellan paneler och riktig backing logic

Anvandaren har uttryckligen bett om att alla paneler och menyer ska verifieras, inte bara UI.

Det betyder att man maste kontrollera:

- har panelen riktig statekoppling
- har panelen riktig skrivvag tillbaka
- sparas data
- laddas data tillbaka efter refresh
- fungerar detta i HOSTED och DEV dar relevant

### 3. Sparningsfunktioner

Detta ar ett explicit anvandarkrav:

- alla sparningar ska granskas
- allt ska kontrolleras end-to-end

Omraden att verifiera:

- profil
- tema
- accentfarg
- dashboard-layout
- kategorier / widgetordning
- standby/display
- projekt
- build-data
- Wizard-importer
- assets/thumbnails
- backup / restore / reset
- hosted bootstrap / sync tillbaka fran server

### 4. Build/3D prestanda

Builden passerar, men warnings visar att bundlen fortfarande ar tung.

Relevant for framtiden:

- gamla iPads
- Raspberry Pi
- eventuell streamad displaylosning

## Dokument som nasta agent bor lasa forst

1. `codex/HANDOFF.md` (denna fil)
2. `docs/lovable-system-audit-plan.md`
3. `CHANGELOG.md`
4. `docs/patchnotes-v1.9.1.md`
5. `README.md`

## Viktiga filer / ytor i systemet

### Home Assistant / live

- `src/lib/apiClient.ts`
- `src/hooks/useHomeAssistant.ts`
- `src/hooks/useHABridge.ts`
- `src/lib/haMenuSelectors.ts`
- `server/api/live.js`
- `server/api/haProxy.js`
- `server/ha/liveHub.js`

### Wizard / assets / import

- `src/lib/wizardClient.ts`
- `src/components/build/BuildModeV2.tsx`
- `src/components/home/cards/WizardConnectionPanel.tsx`
- `server/api/assets.js`

### Build / 2D / 3D / devices

- `src/components/build/BuildModeV2.tsx`
- `src/components/build/BuildCanvas2D.tsx`
- `src/components/PersistentScene3D.tsx`
- `src/components/build/Props3D.tsx`
- `src/components/build/ImportedHome3D.tsx`
- `src/components/devices/DeviceMarkers3D.tsx`
- `src/components/build/BuildTopToolbar.tsx`

### Dashboard / tema / standby

- `src/components/home/HomeView.tsx`
- `src/components/home/DashboardGrid.tsx`
- `src/components/home/cards/ThemeCard.tsx`
- `src/components/home/cards/DisplaySettings.tsx`
- `src/components/standby/StandbyMode.tsx`
- `src/components/standby/StandbyWidgets.tsx`
- `src/hooks/useThemeEffect.ts`

### Persistens / hosted sync / bootstrap

- `src/store/useAppStore.ts`
- `server/api/bootstrap.js`
- `server/api/config.js`
- `server/api/projects.js`
- `server/api/backups.js`
- `src/components/home/cards/DataBackupCard.tsx`

## Vad anvandaren har bett om kring Lovable

Anvandaren ville ha en mycket strikt prompt till Lovable som:

- tvingar Lovable att ga igenom hela systemet
- inte accepterar en snabb sammanfattning
- fokuserar pa hela kedjan UI -> state -> backend -> HA/Wizard -> persistens
- sarskilt lyfter vacuum-sync och alla sparningsfunktioner

Vi skapade darfor `docs/lovable-system-audit-plan.md` och pushade den sa Lovable kan lasa den direkt i repot.

## Viktigt om Sunshine / Moonlight / Raspberry Pi

Detta kom upp i diskussionen som framtida produktspår:

- anvandaren funderade pa att kunna streama dashboarden till Raspberry Pi
- rekommendationen var att inte bygga in streaming i frontend
- Sunshine/Moonlight bor snarare betraktas som ett separat host-lager eller optional host-feature
- om detta blir aktuellt igen bor det byggas som "streamed mode", inte som hard dependency i dashboard-koden

Detta ar inte akut just nu, men ar bra kontext om diskussionen kommer tillbaka.

## Rekommenderat nasta steg for nasta agent

1. Las `docs/lovable-system-audit-plan.md`.
2. Kontrollera om Lovable faktiskt foljer planen eller fortfarande gor ytliga sammanfattningar.
3. Om Lovable levererar kod:
   - granska diffen kritiskt
   - verifiera med riktiga checks
   - jamfor mot anvandarens krav pa sparning och integrationer
4. Om Lovable inte levererar tillrackligt:
   - ta over audit/arbetet lokalt och jobba fas for fas
5. Hojst prioritet:
   - vacuum-sync
   - sparningsfunktioner
   - riktiga panelintegrationer

## Bra kontrollkommandon

Kor fran repo-roten:

```powershell
npm.cmd test
npx.cmd tsc -p tsconfig.app.json --noEmit
npm.cmd run lint
npm.cmd run build
```

## Git-status vid skapandet av denna handoff

Vid start av denna handoff var worktree ren.
Efter att denna fil skapats kommer `codex/` att vara en lokal andring tills den eventuellt committas.

## Slutnot

Det viktigaste for nasta agent ar att inte anta att "audit klar" betyder att systemet ar genuint verifierat.
Anvandaren bryr sig mycket om att allt faktiskt fungerar:

- riktiga kopplingar
- riktiga sparningar
- riktig live-sync
- riktig vacuum-funktion
- riktig samhorighet mellan tema, design, dashboard, Wizard och 3D

Utga fran verkliga verifieringar, inte summeringar.
