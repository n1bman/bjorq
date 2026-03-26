

# Fix: Layout-editor centrering, widget-dragning, kamera/rum-positionering, markörer ljusstyrka

## Problem

1. **Layout-panelen sitter i botten** — config-panelen i `HomeLayoutEditor.tsx` är `absolute bottom-6 left-1/2`. Ska vara mitt på skärmen.

2. **Widgets kan inte placeras fritt** — Drag-handtaget sitter bara på label-taggen (`-top-6`), inte på hela widgeten. Svårt att greppa. Dessutom renderas samma widgets som i normal vy, men det saknas möjlighet att dra hela elementet (pointer capture sker bara på label).

3. **Kamera och Rum-knapparna är "helt off"** — `CameraFab` och `RoomNavigator` renderas via `style={{ left, top }}` men sitter i en `<div className="pointer-events-auto">` utan `position: absolute`. Elementens `absolute z-50` i sina egna komponenter refererar till närmaste positioned parent, som inte har `position: relative`. Resultatet blir att de hamnar fel.

4. **Enhetsmarkörer byter ljusstyrka vid toggle** — `LightMarkerLightOnly` (rad 1669) använder `brightness * 5` och `distance: 8`, medan `LightMarker` (rad 91) använder `brightness * cfg.intensity` (4 för ceiling) och `distance: 5`. Dessa ska matcha så att ljuset inte hoppar när man togglar synlighet.

---

## 1. Centrera layout-panelen

**Fil:** `src/components/home/HomeLayoutEditor.tsx` (rad 172)

Byt `absolute bottom-6 left-1/2` till `absolute top-1/2 left-1/2 -translate-y-1/2` så panelen hamnar mitt på skärmen.

## 2. Gör hela widgeten dragbar

**Fil:** `src/components/home/HomeLayoutEditor.tsx` (rad 133-168)

Flytta `onPointerDown` från label-diven till hela widget-wrappern. Behåll label som visuell indikator men låt hela elementet vara grip-target.

## 3. Fixa kamera/rum-positionering

**Fil:** `src/components/home/HomeView.tsx` (rad 314-318)

Wrappern `<div className="pointer-events-auto">` saknar `position: relative`. CameraFab, RoomNavigator och HomeNav har alla `className="absolute z-50"` i sina egna komponenter men de behöver en positioned parent. Fix: lägg till `relative` på wrappern, eller bättre — rendera varje komponent i sin egen absolutely-positioned wrapper, likt widgetarna.

Ändra så att varje FAB renderas individuellt med `position: absolute` direkt i home-viewens inset-0 container:
```tsx
<CameraFab style={{ position: 'absolute', left: `${cameraPos.x}%`, top: `${cameraPos.y}%` }} />
```

Och i `CameraFab.tsx`, `RoomNavigator.tsx`, `HomeNav.tsx` — byt `className="absolute z-50"` till att respektera den inkommande `style`-prop:en korrekt (ta bort `absolute` från komponentens egen rot-div om style redan sätter position).

## 4. Matcha ljusstyrka i LightMarkerLightOnly

**Fil:** `src/components/devices/DeviceMarkers3D.tsx` (rad 1647-1710)

`LightMarkerLightOnly` ska använda samma `cfg`-logik som `LightMarker`:
- Läs `marker?.lightType` och `marker?.lightConfig`
- Beräkna intensity med samma defaults-map (rad 78-89)
- Använd `cfg.distance`, `cfg.angle`, `cfg.penumbra` istället för hårdkodade värden

Detta gör att ljuset ser identiskt ut oavsett om markören är synlig eller dold.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeLayoutEditor.tsx` | Centrera panelen, gör hela widgeten dragbar |
| `src/components/home/HomeView.tsx` | Fixa FAB-positionering med individuella absolute-wrappers |
| `src/components/home/CameraFab.tsx` | Ta bort `absolute` från rot-div, låt parent styra position |
| `src/components/home/RoomNavigator.tsx` | Samma som CameraFab |
| `src/components/home/HomeNav.tsx` | Samma som CameraFab |
| `src/components/devices/DeviceMarkers3D.tsx` | `LightMarkerLightOnly` använder samma cfg-logik som `LightMarker` |

