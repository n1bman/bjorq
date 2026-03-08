

# Validering & tuning av miljösystemet

## Resultat av granskning

### 1. Scene3D — RENT ✓
`Scene3D.tsx` läser alla ljusvärden från `profile`. Ingen inline weather-logik kvar.

### 2. BuildScene3D — FORTFARANDE INLINE ✗
**Kritiskt:** `BuildScene3D.tsx` rad 47-53 har kvar fullständig inline-beräkning av `ambientIntensity`, `sunIntensity`, `ambientColor` — den ignorerar profilen helt. Samma bug som vi fixade i Scene3D existerar här.

### 3. Profilvärden — tuningproblem

**Cloudy midday** (typiskt skandinaviskt):
- `sunIntensity: 0.25` — OK men skuggorna är **av** (`shadowEnabled: false`). Bra.
- `ambientIntensity: 0.55` — Multipliceras med `atmosphereIntensity` (default 1.0), ger 0.55. Rimligt.
- `hemisphereIntensity: 0.6` — Multipliceras med `indoorBounce` (default **0**!). **Min-cap på 0.3 ger bara 0.18.** Alltför mörkt inomhus.

**Huvudproblemet: `indoorBounce` default = 0**
Formeln: `hemisphereIntensity = profile.hemisphereIntensity × max(indoorBounce, 0.3)`
Med default 0 → `0.6 × 0.3 = 0.18`. Skandinavisk molnig dag inomhus borde ge ~0.45-0.55.

**Clear midday:** sunIntensity 1.2 × 1.0 = 1.2. Shadows on. Bra.
**Dusk (elevation 5°):** dawn-blend vid factor 0.33. sunIntensity ~0.4. OK.
**Night (elevation -10°):** Ren NIGHT-profil. sunIntensity 0. ambient 0.08. OK.

### 4. Cloud coverage interpolation — logikbug
Rad 203: `if (atmosphere.cloudinessAffectsLight && cloudCoverage > 0 && weatherCondition === 'clear')`
Om HA rapporterar `weatherCondition: 'cloudy'` **triggas aldrig cloud-interpolationen**. Man hoppar direkt till den hårda CLOUDY-profilen. Det borde blenda baserat på `cloudCoverage` oavsett condition.

### 5. `indoorFillIntensity` — beräknas men används aldrig
Värdet sätts i profilen men inget i scenen konsumerar det. Det var tänkt som en extra fill-boost inomhus.

### 6. Fallback-beteende
- HA sun + HA cloud: ✓ (syncFromHA läser båda)
- HA sun + estimated cloud: ✓ (fallback via `estimateCloudCoverage`)
- Weather API: ✓ (Open-Meteo + estimateCloudCoverage)
- Manual: Delvis ✓ — `updateProfile()` anropas, men initialt `indoorBounce=0` ger mörkt resultat

---

## Plan

### Steg 1: Migrera BuildScene3D till profil-driven belysning
Ta bort rad 47-53 (inline beräkningar) och ersätt med samma profil-drivna mönster som Scene3D.

### Steg 2: Tune indoorBounce default
Ändra default från `0` till `1.0` i store. Detta ger `hemisphereIntensity × 1.0` = fulla hemisphere-värdet. Användaren kan sedan sänka/höja.

### Steg 3: Höj CLOUDY ambient + hemisphere för skandinavisk känsla
```
CLOUDY:
  ambientIntensity: 0.55 → 0.65
  hemisphereIntensity: 0.6 → 0.7
```
Och PARTLY_CLOUDY:
```
  ambientIntensity: 0.45 → 0.50
  hemisphereIntensity: 0.5 → 0.55
```

### Steg 4: Fixa cloud-interpolation logik
Ta bort `&& weatherCondition === 'clear'` villkoret. Istället: interpolera alltid baserat på `cloudCoverage` mellan CLEAR och det condition-specifika profilet, oavsett rapporterad condition.

### Steg 5: Lägg till Environment Debug HUD
Utöka befintliga `PerformanceHUD` med en miljösektion (visas bara om `showHUD` är på):
- condition, cloudCoverage, phase, sunElevation
- sunIntensity (computed), ambientIntensity, hemisphereIntensity, indoorFillIntensity

### Steg 6: Cloudy weather = mjukare fönsterljus
Shadows redan `false` i CLOUDY — korrekt. Men PARTLY_CLOUDY har `shadowEnabled: true` med `shadowSoftness: 0.5`. Ändra shadow-bias i Scene3D till `-0.003` för mjukare kanter vid `shadowSoftness > 0.3`.

---

### Filändringar

| Fil | Ändring |
|-----|--------|
| `src/components/build/BuildScene3D.tsx` | Ersätt inline ljusberäkning med profil-driven |
| `src/lib/environmentEngine.ts` | Tune CLOUDY/PARTLY_CLOUDY, fixa cloud-interpolation |
| `src/store/useAppStore.ts` | `indoorBounce` default 0 → 1.0 |
| `src/components/home/PerformanceHUD.tsx` | Lägg till environment debug-sektion |
| `src/components/Scene3D.tsx` | Dynamisk shadow-bias baserat på shadowSoftness |

