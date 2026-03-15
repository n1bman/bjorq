# Patchnotes — v1.7.x

**Datum:** 2026-03-15  
**Typ:** Stabilisering, enhetssystem och UX-fix

---

## Sammanfattning

Version 1.7.x fokuserar på att stabilisera enhetssystemet, fixa regressioner från den persistenta 3D-runtime-refaktoreringen, och förbättra bibliotek/import-flödet. Serien inkluderar buggfixar för 3D-markörer, kamerahantering, enhetsinspektion och biblioteksimport.

---

## v1.7.0 — Version bump (2026-03-15)

### Ändrat
- Version bumpat till 1.7.0 i `package.json`, `server/package.json` och `config.yaml`.

---

## v1.7.1 — Patch (2026-03-15)

### Fixat
- **Enhetsinspektor-ikoner** — varje enhetstyp visar nu sin korrekta ikon (högtalare, fläkt, sensor etc.) istället för att falla tillbaka till glödlampa.
- **Markering rensas vid lägesbyte** — att byta bort från Design-läge avmarkerar nu alla rum, väggar, enheter och möbler. Förhindrar kvarvarande markeringsramar i Hem/Dashboard-vyer.
- **Bibliotek-import** — att klicka "Importera" i Biblioteket öppnar nu filväljaren direkt istället för att kräva ytterligare ett klick i dialogen.

---

## v1.7.2 — Patch (2026-03-15)

### Fixat
- **3D-medieskärm återställd** — att placera en "Skärm"-enhet sparar nu korrekt kind som `media_screen` (var `media-screen` pga verktygsnyckelmismatch). Den fullständiga 3D-monitorn med Spotify/Now Playing-visualisering fungerar igen.
- **Legacy-enhetsmigrering** — befintliga projekt med `media-screen`-markörer migreras automatiskt till `media_screen` vid laddning.
- **Bibliotek-import persistens** — importerade 3D-modeller dyker nu tillförlitligt upp i biblioteket efter import; base64-kodning inväntas innan dialogen stängs, och modellen auto-väljs med korrekta filter.

---

## v1.7.3 — Patch (2026-03-15)

### Tillagt
- **Ny enhetstyp: Egg** — ny `egg`-enhetstyp under Robot-kategorin. Guldgul 3D-markör (🥚). Ingen Home Assistant-domänmappning (fristående enhet).

### Fixat
- **Vägghörnskuber borttagna** (v1.6.3) — `generateCornerBlocks` helt eliminerad; väggar överlappar nu lätt vid korsningar (trim 0.5 → 0.35) utan extra geometri som klippar genom möbler.

---

## Filöversikt (v1.6.2 → v1.7.3)

### Ändrade filer
| Fil | Förändring |
|-----|-----------|
| `src/store/types.ts` | `DeviceKind` utökad med `egg`, `BuildTool` utökad med `place-egg` |
| `src/components/build/devices/DevicePlacementTools.tsx` | Egg tillagd i Robot-kategori |
| `src/components/build/BuildModeV2.tsx` | Egg tillagd i inlinad enhetsplacering |
| `src/components/build/BuildInspector.tsx` | Egg tillagd i kindLabels |
| `src/components/devices/DeviceMarkers3D.tsx` | Egg-markör (guld #d4a017) tillagd |
| `src/components/devices/DevicesOverlay.tsx` | Egg tillagd i enhetsmenyn |
| `src/components/home/DashboardGrid.tsx` | Egg tillagd i kindCategory |
| `src/components/home/cards/CategoryCard.tsx` | Egg emoji tillagd |
| `src/components/home/cards/DevicesSection.tsx` | Egg info tillagd |
| `src/components/home/cards/RoomCard.tsx` | Egg ikon tillagd |
| `src/lib/haDomainMapping.ts` | Egg → null (ingen HA-domän) |

---

## Kända begränsningar

- Egg-enheten har ingen Home Assistant-integration (avsiktligt)
- Egg-enheten har ingen specialiserad 3D-modell — använder generisk sfärmarkör i guld
