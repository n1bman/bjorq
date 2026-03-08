

# Konsolidera Grafik & Miljö till 3 tydliga sektioner

## Problem
1. **Dubbletter**: Nederbördseffekt finns i Väder-fliken OCH i WeatherAtmospherePanel. Live-synk finns i SOL-panelen OCH i Väder-panelen.
2. **4 separata paneler** i ett grid — ser rörigt ut, svårt att orientera sig
3. **~15 reglage** exponerade direkt, varav hälften är utvecklarnivå (tone mapping, exponering, DPR, max ljuskällor, anti-aliasing, HDR)

## Lösning

Slå ihop till **3 tydliga sektioner** i en enda scrollbar kolumn (inte grid), med avancerade inställningar dolda bakom Collapsible:

### Sektion 1: Rendering
Behåller: Kvalitetsval (Låg/Medium/Hög), Surfplatteläge, Skuggor, Performance HUD, Återställ-knapp, Belastningsindikator

**Dolt under "Avancerat"** (Collapsible):
- Anti-aliasing
- Efterbearbetning  
- Tone mapping + exponering
- Miljöljus (HDR)
- Max ljuskällor

### Sektion 2: Sol & Väder
Slår ihop SunCalibrationPanel + WeatherAtmospherePanel till EN panel:
- Live-synk toggle (EN gång, styr både sol och väder)
- HA-väder toggle (visas bara om HA connected och live aktiv)
- Aktuellt väder-readout
- Manuellt väderval (visas bara i manuellt läge)
- Nederbördseffekt i 3D (BORTTAGEN från Väder-fliken, bara här)

**Dolt under "Kalibrering"** (Collapsible):
- Husets nordriktning
- Azimut-korrigering
- Elevations-korrigering
- Solljusstyrka
- Inomhus fyllnadsljus

**Dolt under "Atmosfär"** (Collapsible):
- Moln påverkar ljus
- Dimma + densitet
- Atmosfärsintensitet
- Dag/natt-övergång

### Sektion 3: Miljö
EnvironmentPanel (oförändrad — redan kompakt):
- Markyta toggle + färg/radie
- Himmel/bakgrund-val

## Borttagning av dubblett
- Ta bort "Nederbördseffekt i 3D"-blocket från `WeatherCategory` i DashboardGrid.tsx

## Filändringar

| Fil | Ändring |
|-----|--------|
| `src/components/home/cards/GraphicsSettings.tsx` | Flytta avancerade reglage in i Collapsible "Avancerat" |
| `src/components/home/cards/SunCalibrationPanel.tsx` | Slå ihop med WeatherAtmospherePanel till ny `SunWeatherPanel.tsx` |
| `src/components/home/cards/WeatherAtmospherePanel.tsx` | Ta bort — innehåll flyttat till SunWeatherPanel |
| `src/components/home/DashboardGrid.tsx` | GraphicsCategory: enda kolumn med 3 sektioner. WeatherCategory: ta bort dubblett-nederbördsknapparna |
| `src/components/home/cards/EnvironmentPanel.tsx` | Oförändrad |

## Layout
```text
┌──────────────────────────────┐
│  🎯 Rendering                │
│  [Låg] [Medium] [Hög]        │
│  Surfplatteläge  ○            │
│  Skuggor         ○            │
│  Performance HUD ○            │
│  ▸ Avancerat                  │  ← Collapsible
│  [Återställ standard]         │
├──────────────────────────────┤
│  ☀️ Sol & Väder               │
│  Live-synk       ○            │
│  Aktuellt: ☀️ Klart · 12°C    │
│  Nederbörd: [Auto][Regn]...   │
│  ▸ Kalibrering                │  ← Collapsible
│  ▸ Atmosfär                   │  ← Collapsible
├──────────────────────────────┤
│  🌿 Miljö & Terräng           │
│  (oförändrad)                 │
└──────────────────────────────┘
```

