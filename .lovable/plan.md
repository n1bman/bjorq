

# Refaktor, dokumentation & versionsuppdatering

## Identifierade problem

### 1. Döda filer (dead code)
- `src/components/home/cards/SunCalibrationPanel.tsx` — ersatt av `SunWeatherPanel.tsx`, importeras ingenstans
- `src/components/home/cards/WeatherAtmospherePanel.tsx` — samma sak, importeras ingenstans

### 2. React ref-varningar i konsolen
- `CollapsibleSection` i `SunWeatherPanel.tsx` — Radix Collapsible försöker ge ref till funktionskomponenten. Behöver `React.forwardRef`.
- `EnvironmentPanel` — samma problem, Radix-komponenter försöker forwarda refs.

### 3. Dokumentation ej uppdaterad
Docs saknar information om:
- Konsoliderad "Grafik & Miljö"-vy (3 sektioner: Rendering, Sol & Väder, Miljö)
- Selektiv skuggkastning på importerade modeller (solljus genom fönster)
- Reaktiv ljusprofil (recomputeEnvProfile)
- SunWeatherPanel (ersätter SunCalibrationPanel + WeatherAtmospherePanel)
- Uppdaterad roadmap (fas 7 shadow-info)

### 4. Version & CHANGELOG
Nuvarande version: 0.6.1. Behöver bump till 0.7.0 (ny funktionalitet: konsoliderad grafik-vy, solljus genom fönster).

## Plan

### Steg 1: Ta bort döda filer
- Radera `SunCalibrationPanel.tsx`
- Radera `WeatherAtmospherePanel.tsx`

### Steg 2: Fixa React ref-varningar
- `CollapsibleSection` i `SunWeatherPanel.tsx`: wrappa med `React.forwardRef`
- `EnvironmentPanel`: wrappa med `React.forwardRef`

### Steg 3: Uppdatera CHANGELOG.md
Lägg till `[0.7.0]` med:
- Konsoliderad Grafik & Miljö-vy (3 sektioner med Collapsible)
- Reaktiv ljusprofil (sol/väder-ändringar uppdaterar 3D direkt)
- Selektiv skuggkastning (solljus genom fönster, glasdetektering)
- Borttagna gamla SunCalibrationPanel/WeatherAtmospherePanel
- Fixade React ref-varningar

### Steg 4: Bumpa version
`package.json` version → `"0.7.0"`

### Steg 5: Uppdatera docs

**`docs/03-using-the-dashboard.md`**:
- Uppdatera Settings-tabellen: "Grafik & Miljö" beskrivning med de 3 sektionerna
- Lägg till info om sol & väder-konsolidering

**`docs/04-performance-and-3d.md`**:
- Lägg till sektion om selektiv skuggkastning (solljus genom fönster)
- Uppdatera shadow-sektionen med info om glasdetektering

**`docs/07-troubleshooting.md`**:
- Lägg till "Inget solljus inomhus" → kontrollera att skuggor är påslagna + importerad modell har namngivna glasmaterial

**`docs/roadmap-vNext.md`**:
- Uppdatera Phase 7 shadow-info med selektiv castShadow
- Lägg till ny sektion om Grafik-konsolidering

**`README.md`**:
- Bumpa version badge till 0.7.0

### Filändringar

| Fil | Ändring |
|-----|--------|
| `src/components/home/cards/SunCalibrationPanel.tsx` | **Ta bort** |
| `src/components/home/cards/WeatherAtmospherePanel.tsx` | **Ta bort** |
| `src/components/home/cards/SunWeatherPanel.tsx` | forwardRef på CollapsibleSection |
| `src/components/home/cards/EnvironmentPanel.tsx` | forwardRef |
| `package.json` | version → 0.7.0 |
| `CHANGELOG.md` | Ny [0.7.0]-sektion |
| `README.md` | Version badge → 0.7.0 |
| `docs/03-using-the-dashboard.md` | Grafik & Miljö-beskrivning |
| `docs/04-performance-and-3d.md` | Selektiv skuggkastning |
| `docs/07-troubleshooting.md` | Solljus-troubleshooting |
| `docs/roadmap-vNext.md` | Fas 7 + grafik-konsolidering |

