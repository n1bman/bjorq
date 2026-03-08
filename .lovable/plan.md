

# Solljuset försvinner — bugg + fix

## Rotorsak

`updateProfile()` (som räknar om ljusprofilen) anropas **bara** från `useWeatherSync`-hooken vid:
- Initial mount
- Vädersynk-intervaller (var 15:e minut / 60 sek)

Men **INTE** när användaren ändrar inställningar. Store-actions som `setSunCalibration`, `setAtmosphere`, `setWeather`, `setSunPosition` uppdaterar rådata men triggar aldrig omberäkning av profilen.

Resultat: profilen blir inaktuell. Om den av någon anledning räknades om till en dålig profil (t.ex. vid natt-elevation), fastnar den där.

Dessutom: `updateProfile()` är en modul-intern funktion i `useWeatherSync.ts` — den kan inte anropas från store-actions.

## Fix

### 1. Exportera `updateProfile()` från `useWeatherSync.ts`

### 2. Anropa `updateProfile()` i alla relevanta store-actions:
- `setSunPosition` — efter att azimut/elevation uppdateras
- `setWeather` (condition change)
- `setSunCalibration` — efter kalibreringsändring  
- `setAtmosphere` — efter atmosfärändringar
- `setCloudCoverage`
- `setPrecipitationOverride`

### 3. Undvik cirkulär import
`useAppStore.ts` importerar redan från `environmentEngine.ts`. Flytta `updateProfile()` till `environmentEngine.ts` som en hjälpfunktion, eller gör den till en fristående export i `useWeatherSync.ts` som store kan importera.

Enklaste lösningen: importera `computeEnvironmentProfile` direkt i store-actions och anropa `setEnvironmentProfile` inline — ingen extern `updateProfile()` behövs.

### Implementering

**`src/store/useAppStore.ts`** — I varje relevant action, efter state-uppdateringen, lägg till:

```typescript
// Pattern för varje action:
setSunPosition: (azimuth, elevation) => {
  set((s) => ({ environment: { ...s.environment, sunAzimuth: azimuth, sunElevation: elevation } }));
  // Recompute profile
  const env = get().environment;
  const profile = computeEnvironmentProfile({ ... env fields ... });
  set((s) => ({ environment: { ...s.environment, profile } }));
},
```

Actions att uppdatera: `setSunPosition`, `setWeather`, `setSunCalibration`, `setAtmosphere`, `setCloudCoverage`, `setPrecipitationOverride`

**`src/hooks/useWeatherSync.ts`** — Behåll `updateProfile()` för sync-cyklerna (den fungerar redan korrekt där).

### Filer

| Fil | Ändring |
|-----|--------|
| `src/store/useAppStore.ts` | Lägg till profilomberäkning i 6 store-actions |

