# Floor Texture Download Guide

All textures are from [ambientCG](https://ambientcg.com) — CC0 (public domain).

## How to use

1. Download the 1K-JPG ZIP from the link below
2. Extract the `*_1K_Color.jpg` file
3. Rename it to the filename shown and place it in the corresponding category folder under `public/textures/`
4. Once placed, the app will use the local file instead of the CDN preview

> **Note:** Floor textures use category-based folders (`wood/`, `tile/`, `stone/`, `texture/`), NOT a single `floor/` folder.
> Wall textures are in `wallpaper/`, `tile/`, `stone/`, `texture/`.
> There is no `public/textures/floor/` directory — this is by design.

> Until local files are placed, the app uses CDN preview images (2048px) which work fine but are not seamlessly tileable.

---

## Folder structure

```
public/textures/
├── stone/       — Concrete, limestone, slate, etc.
├── texture/     — Stucco, venetian plaster, limewash, microcement
├── tile/        — White tile, dark tile, marble, subway, etc.
├── wallpaper/   — Linen, silk, grasscloth
├── wood/        — Oak, walnut, pine, herringbone
├── carpet/      — (create this folder for carpet textures)
└── guide/       — This README
```

Each preset in `src/lib/materials.ts` references a `mapPath` (e.g. `/textures/wood/oak_diff.jpg`).
Floor-only presets with `floorOnly: true` use CDN URLs by default and fall back to the color value if unavailable.

---

## Wood (Trä & Parkett)

| Preset | ambientCG ID | Target path | Download |
|--------|-------------|-------------|----------|
| Ljus ek planka | WoodFloor051 | `public/textures/wood/lightoak_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor051_1K-JPG.zip) |
| Mörk valnöt planka | WoodFloor040 | `public/textures/wood/darkwalnut_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor040_1K-JPG.zip) |
| Ask vitvax | WoodFloor044 | `public/textures/wood/ash_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor044_1K-JPG.zip) |
| Rökt ek | WoodFloor043 | `public/textures/wood/smokedoak_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor043_1K-JPG.zip) |
| Bambu | WoodFloor006 | `public/textures/wood/bamboo_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor006_1K-JPG.zip) |

## Tile (Kakel & Klinker)

| Preset | ambientCG ID | Target path | Download |
|--------|-------------|-------------|----------|
| Stor porslin | Tiles074 | `public/textures/tile/porcelain_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Tiles074_1K-JPG.zip) |
| Terrakotta golv | Tiles093 | `public/textures/tile/terracotta_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Tiles093_1K-JPG.zip) |
| Hexagon cement | Tiles054 | `public/textures/tile/hexcement_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Tiles054_1K-JPG.zip) |
| Schackrutigt | Tiles012 | `public/textures/tile/checkerboard_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Tiles012_1K-JPG.zip) |
| Skiffer kakel | Tiles082 | `public/textures/tile/slatetile_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Tiles082_1K-JPG.zip) |

## Stone & Concrete (Sten & Betong)

| Preset | ambientCG ID | Target path | Download |
|--------|-------------|-------------|----------|
| Polerad betong golv | Concrete034 | `public/textures/stone/polconcrete_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Concrete034_1K-JPG.zip) |
| Rå betong | Concrete032 | `public/textures/stone/rawconcrete_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Concrete032_1K-JPG.zip) |
| Travertin | Marble006 | `public/textures/stone/travertine_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Marble006_1K-JPG.zip) |
| Granit | Rock030 | `public/textures/stone/granite_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Rock030_1K-JPG.zip) |
| Mikrociment golv | Concrete040 | `public/textures/stone/microcement_floor_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Concrete040_1K-JPG.zip) |

## Texture

| Preset | ambientCG ID | Target path | Download |
|--------|-------------|-------------|----------|
| Tadelakt | PaintedPlaster017 | `public/textures/texture/tadelakt_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=PaintedPlaster017_1K-JPG.zip) |
| Epoxigolv | Metal034 | `public/textures/texture/epoxy_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Metal034_1K-JPG.zip) |
| Kork | Cork002 | `public/textures/texture/cork_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Cork002_1K-JPG.zip) |
| Vinylplanka | WoodFloor038 | `public/textures/texture/vinyl_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=WoodFloor038_1K-JPG.zip) |
| Linoleum | PaintedPlaster020 | `public/textures/texture/linoleum_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=PaintedPlaster020_1K-JPG.zip) |

## Carpet (Matta)

Create `public/textures/carpet/` and place files there:

| Preset | ambientCG ID | Target path | Download |
|--------|-------------|-------------|----------|
| Slinga grå | Fabric032 | `public/textures/carpet/loopgrey_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Fabric032_1K-JPG.zip) |
| Velour beige | Fabric030 | `public/textures/carpet/velourbeige_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Fabric030_1K-JPG.zip) |
| Sisal natur | Fabric029 | `public/textures/carpet/sisal_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Fabric029_1K-JPG.zip) |
| Berber grädde | Fabric026 | `public/textures/carpet/berber_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Fabric026_1K-JPG.zip) |
| Ull antracit | Fabric036 | `public/textures/carpet/woolcharcoal_diff.jpg` | [Download ZIP](https://ambientcg.com/get?file=Fabric036_1K-JPG.zip) |
