# Patchnotes — v1.8.0

**Datum:** 2026-03-18  
**Typ:** Byggstabilisering och CI-fix

---

## Sammanfattning

Version 1.8.0 löser ett kritiskt CI-byggfel där filen `RoomWallSurfaces3D.tsx` inte synkades korrekt till GitHub, vilket orsakade `Could not resolve "./RoomWallSurfaces3D"` i Rollup under Actions-byggen. Fixen inlinear komponenten i den redan spårade `Walls3D.tsx` och eliminerar därmed beroendet av en separat fil.

---

## v1.8.0 — CI-fix (2026-03-18)

### Fixat
- **Bygget misslyckas i CI** — `RoomWallSurfaces3D`-komponenten och dess hjälpfunktioner (`clipWallToRoom`, `generateClippedStrips`) flyttade in i `Walls3D.tsx`. Importreferensen i `InteractiveWalls3D.tsx` uppdaterad till `./Walls3D`. Filen `RoomWallSurfaces3D.tsx` tappades upprepade gånger av GitHub-synken trots att den existerade lokalt.

### Ändrat
- Version bumpat till 1.8.0 i:
  - `package.json`
  - `server/package.json`
  - `bjorq_dashboard/config.yaml`
  - README-badge
  - CHANGELOG.md

---

## Filöversikt

| Fil | Förändring |
|-----|-----------|
| `src/components/build/Walls3D.tsx` | `RoomWallSurfaces3D` + hjälpfunktioner inlineade |
| `src/components/build/InteractiveWalls3D.tsx` | Import ändrad från `./RoomWallSurfaces3D` till `./Walls3D` |
| `package.json` | 1.7.3 → 1.8.0 |
| `server/package.json` | 1.7.3 → 1.8.0 |
| `bjorq_dashboard/config.yaml` | 1.7.3 → 1.8.0 |
| `README.md` | Badge 1.5.3 → 1.8.0 |
| `CHANGELOG.md` | v1.8.0-entry tillagd |

---

## Kända begränsningar

- Inga funktionella ändringar — rummålning och vägg-ytor fungerar identiskt som i 1.7.x.
