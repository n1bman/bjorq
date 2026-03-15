# Patchnotes — v1.6.0

**Datum:** 2026-03-15  
**Typ:** Major arkitekturell refaktorering  

---

## Sammanfattning

Version 1.6.0 introducerar en persistent 3D-runtime, centraliserad resurscache och adaptiv rendering. Dessa tre faser utgör den största arkitekturella förändringen sedan v1.0.

## Vad har ändrats?

### 🏗️ Fas 1 — Centraliserad Model & Texture Cache
- **Ny fil:** `src/lib/modelCache.ts` (316 rader)
- Singleton-cache med referensräkning — modeller och texturer delas mellan alla instanser
- LRU-eviction: max 50 modeller / 2M trianglar i minnet
- `acquireModel()` / `releaseModel()` API — kloner av "golden" original
- `acquireTexture()` / `releaseTexture()` — delade THREE.Texture-instanser
- `buildCacheKey()` — catalog-items delar nyckel, uploads får unika

### 🎬 Fas 2–3 — Persistent 3D Canvas
- **Ny fil:** `src/components/PersistentScene3D.tsx` (~950 rader)
- En enda `<Canvas>` monterad i `Index.tsx` — överlevdallrumsbyte (Hem → Design → Standby)
- `UnifiedSceneContent` anpassar belysning, kamera och interaktioner per `appMode`
- WebGL-kontextåterställning med exponentiell backoff
- **Borttagna filer:** `Scene3D.tsx` (~450 rader), `BuildScene3D.tsx` (~700 rader)

### ⚡ Fas 3.5 — Adaptiv Rendering
- `FrameThrottle`-komponent inuti Canvas
- Standby: ~10fps (kameradrift)
- Vio (djup standby): rendering helt pausad
- Home/Build: full hastighet
- Dashboard: persistent canvas synlig som bakgrund

### 🎨 Fas 4 — Branded Loading Screen
- `src/components/LoadingScreen.tsx` med BjorQ-logotyp
- Progressbar + statusmeddelanden vid uppstart
- Visas tills `initHostedMode()` har klarat sig

### 📊 Fas 5 — Cache HUD
- PerformanceHUD visar nu:
  - Render-läge: FULL / ~10FPS / PAUSED / HIDDEN
  - Cache-statistik: antal modeller, trianglar, texturer

## Buggar som fixats
| Bugg | Orsak | Fix |
|------|-------|-----|
| Kamera låst i Design-läge | BuildModeV2 overlay blockerade pointer events | `pointer-events-none` på root, `pointer-events-auto` på knappar |
| 3D-vy borta från Dashboard | Canvas doldes med `visibility: hidden` | Tog bort `appMode === 'dashboard'` från `isHidden` |
| 2D-karta borta i Design | BuildCanvas2D-wrapper saknade storlek | Lade till `absolute inset-0` |
| Redundanta WebGL-kontexter | DashboardView/Grid skapade extra Canvas | Tog bort Scene3D-importer |

## Checklista vid stora förändringar

När du gör arkitekturella refaktoreringar av den här storleken:

1. **Sök efter alla importer** av borttagna filer innan du raderar dem
2. **Verifiera pointer-events** — overlay-arkitektur kräver explicit `pointer-events-none`/`auto`
3. **Testa alla appMode-övergångar**: Home → Design (3D) → Design (2D) → Dashboard → Standby → Vio → tillbaka
4. **Kontrollera WebGL-kontexter** — bara EN `<Canvas>` ska existera i DOM:en
5. **Kör PerformanceHUD** — verifiera FPS, cache-stats, render-läge i alla modes
6. **Testa camera controls** — pan, rotate, zoom i varje läge
7. **Verifiera HA-synk** — enheter ska reagera på live-state i alla lägen
8. **Dokumentera i CHANGELOG.md** — följ Keep a Changelog-format
9. **Bumpa version** i `package.json`
10. **Skapa patchnotes** — detaljerad teknisk sammanfattning

## Filöversikt

| Fil | Status | Rader |
|-----|--------|-------|
| `src/lib/modelCache.ts` | Ny | 316 |
| `src/components/PersistentScene3D.tsx` | Ny | ~950 |
| `src/components/LoadingScreen.tsx` | Ny | 70 |
| `src/components/home/PerformanceHUD.tsx` | Uppdaterad | 90 |
| `src/pages/Index.tsx` | Uppdaterad | 100 |
| `src/components/build/BuildModeV2.tsx` | Uppdaterad | 2612 |
| `src/components/home/DashboardView.tsx` | Uppdaterad | 32 |
| `src/components/home/DashboardGrid.tsx` | Uppdaterad | 644 |
| `src/components/Scene3D.tsx` | **Raderad** | — |
| `src/components/build/BuildScene3D.tsx` | **Raderad** | — |
