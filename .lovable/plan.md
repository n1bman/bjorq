
# Robotdammsugare: Live 3D-modell, dashboard-flik och zonmappning

## Oversikt

En dedikerad robotdammsugare-upplevelse med en animerad 3D-modell i scenen, en ny kontrollpanelsflik, utokad HA-synkronisering, och mojlighet att definiera stadzoner i bygglageet.

---

## 1. Utokad VacuumState (types.ts)

Lagga till fler attribut fran HA for att stodja Roborock S5 Max fullt ut:

| Nytt falt | Typ | Beskrivning |
|-----------|-----|-------------|
| `fanSpeed` | `number` | Sugeffekt 0-100% |
| `fanSpeedList` | `string[]` | Tillgangliga lagesnamn (Silent, Standard, etc.) |
| `cleaningArea` | `number` | Stadad yta i m2 |
| `cleaningTime` | `number` | Stadtid i minuter |
| `position` | `[number, number]` | Vakuumens x,z-koordinat i meter (mappat fran HA:s pixelkoordinater) |
| `dockPosition` | `[number, number]` | Dockningsstationens position |
| `errorMessage` | `string` | Felmeddelande |

## 2. Animerad 3D-modell (DeviceMarkers3D.tsx)

Byt ut den generiska lila kuben mot en dedikerad `VacuumMarker`:

- **Form**: En platt cylindrisk kropp (som en riktig robotdammsugare) med en liten LED-ring pa toppen
- **Geometri**: `cylinderGeometry` (radie ~0.17m, hojd ~0.05m) med rundade kanter
- **Fargkodning**: Vit kropp med statusfargad LED-ring -- gron (dockad), bla (stadar), orange (atervander), rod (fel)
- **Animation med useFrame**:
  - Nar status ar `cleaning`: roboten roterar sakta och ringlens ljus pulserar
  - Nar status ar `returning`: roboten "glider" tillbaka mot dockningspositionen (om `position`-data finns)
  - Nar status ar `docked`: statisk, dampat ljus
- **Positionssynk**: Om `position` finns i state, interpolerar roboten mjukt (lerp) till den positionen varje frame
- **Batteri-indikator**: En tunn progress-ring runt basen som visar batteriniva (gron > 50%, gul 20-50%, rod < 20%)

## 3. Ny dashboard-flik: "Robot" (DashboardGrid.tsx)

Lagg till en ny flik `'robot'` i kontrollpanelens navigation, placerad efter "Overvakning":

```text
Hem | Vader | Kalender | Enheter | Energi | Overvakning | Robot | Aktivitet | Profil | Widgets
```

### RobotPanel-komponent (ny fil: `src/components/home/cards/RobotPanel.tsx`)

Innehall:

- **Status-sektion**: Stor statusikon + text (Stadar / Dockad / Atervander / Fel)
- **Batteri**: Visuell batteriindikator med procent
- **Kontrollknappar**: Starta, Stoppa, Hem (atergang till docka), Lokalisera (piper)
- **Sugeffekt**: Slider eller knappar for fanSpeed-nivåer (Silent / Standard / Turbo / Max)
- **Statistik**: Stadad yta (m2) och stadtid sedan senaste start
- **Karta**: Placeholder for framtida kartintegration (Valetudo-karta)
- **Senaste fel**: Visa felmeddelande om status ar "error"

## 4. Utokad HA-mappning (haMapping.ts)

Utoka vacuum-case:n for att hamta fler attribut:

- `fan_speed` -> `fanSpeed` (numeriskt, mappat fran procent eller namngivna lagen)
- `fan_speed_list` -> `fanSpeedList`
- `cleaned_area` -> `cleaningArea` (m2, ev. konvertering)
- `cleaning_time` -> `cleaningTime` (minuter)
- `error` -> `errorMessage`
- `status` -> finare mappning med fler tilstand

## 5. Utokad HA-bridge (useHABridge.ts)

Lagg till stod for:

- `vacuum.set_fan_speed` -- nar fanSpeed andras
- `vacuum.locate` -- skicka "pip"-kommando for att hitta roboten
- `vacuum.clean_spot` -- punktstadning (framtida)

Ny `_action`-logik for vacuum:

```text
_action: 'locate' -> vacuum.locate
_action: 'spot_clean' -> vacuum.clean_spot
fanSpeed andras -> vacuum.set_fan_speed med fan_speed_list-mappning
```

## 6. Utokad VacuumControl (DeviceControlCard.tsx)

Forbattra den befintliga `VacuumControl`:

- Lagg till sugeffekt-valjare (slider eller knappar baserat pa `fanSpeedList`)
- Lagg till "Lokalisera"-knapp
- Visa stadstatistik (yta + tid)
- Visa felmeddelande med varningsikon om status ar "error"

## 7. Zonmappning i bygglageet (framtida forberedelse)

I denna forsta iteration:
- Roboten rör sig enbart inom de rum/polygoner som definieras pa dess våning
- Position klamras automatiskt till inuti husvaggarna om `position`-data finns
- Framtida: mojlighet att rita "no-go zones" i 2D-planvyn

---

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/store/types.ts` | Utoka `VacuumState` med nya falt |
| `src/components/devices/DeviceMarkers3D.tsx` | Ny `VacuumMarker` med cylindergeometri, statusfarg, animation, batteriindikator |
| `src/components/home/DashboardGrid.tsx` | Lagg till `'robot'`-flik i navigation och rendera `RobotPanel` |
| `src/components/home/cards/RobotPanel.tsx` | **Ny fil** -- Fullstandig robotpanel med status, kontroller, sugeffekt, statistik |
| `src/components/home/cards/DeviceControlCard.tsx` | Utoka `VacuumControl` med sugeffekt, lokalisera, statistik |
| `src/lib/haMapping.ts` | Utoka vacuum-mappning med fan_speed, cleaned_area, cleaning_time, error |
| `src/hooks/useHABridge.ts` | Lagg till `set_fan_speed`, `locate`, `_action`-hantering for vacuum |
