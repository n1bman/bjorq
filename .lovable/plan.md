

# Fix: Layout-drag, popup-riktning, expanderbara enhets-pills, energi-widget, ljusmatchning

## Problem

1. **Nav/Kamera/Rum kan inte dras** — `setPointerCapture` anropas på `e.target` (ofta ett child-element), men pointer-move/up lyssnas på container-diven. Capture måste sättas på containern.

2. **Kamera- och Rum-menyer går neråt** — Komponenternas root-div har `style={{ top: '78%' }}` och `flex-col`. Allt flödar nedåt från den punkten — menyn hamnar under knappen istället för ovanför. Fix: ändra layouten så knappen ankras i botten och menyn poppar uppåt.

3. **Widgets som enhets-pills saknar expand-funktion** — Vacuum/klimat etc hade tidigare alternativ (städa, paus) men nu är pills bara toggle-knappar. Behöver expanderbart kort under pillsen.

4. **Energi-widget har gammal sparkline med dots som ser ut som gauge** — `EnergyWidget` expanded visar `EnergySparkline` med peak-dots som ser inkonsistent ut med den kompakta vyn.

5. **LightMarkerLightOnly matchar inte LightMarker** — Strip-typen har `decay: 1.5` i LightOnly men `decay: 2` i LightMarker. Liten skillnad men synlig.

---

## 1. Fixa drag i HomeLayoutEditor

**Fil:** `src/components/home/HomeLayoutEditor.tsx`

Ändra `handlePointerDown` (rad 79-87): anropa `setPointerCapture` på `containerRef.current` istället för `e.target`:

```ts
const handlePointerDown = useCallback((key, e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragging(key);
  // ...
  containerRef.current?.setPointerCapture(e.pointerId); // ← fix
}, [widgetLayout]);
```

## 2. Fixa popup-riktning för CameraFab och RoomNavigator

**Fil:** `src/components/home/CameraFab.tsx`

Problemet: `flex-col` med `top: 78%` → allt flödar neråt. Fix: Byt till `flex-col-reverse` så knappen renderas först (längst ner) och menyn poppar uppåt:

```tsx
<div className="z-50 flex flex-col-reverse items-end gap-2 pointer-events-auto" style={style}>
  <button>...</button>
  {open && <div className="glass-panel ...">...</div>}
</div>
```

**Fil:** `src/components/home/RoomNavigator.tsx`

Samma fix — `flex-col-reverse` och flytta `<button>` före menu-diven i JSX.

**Fil:** `src/components/home/HomeNav.tsx`

Samma fix — `flex-col-reverse` och flytta expanderbar meny under knappen i JSX-ordning (men renderas ovanför visuellt).

## 3. Expanderbara enhets-pills i hemvyn

**Fil:** `src/components/home/HomeView.tsx`

Lägg till expanderbart beteende på device pills:
- Klick på pill → om enheten stödjer det (vacuum, media, klimat), visa en expanderbar panel under pillen med snabbåtgärder
- State: `expandedPillId`
- Vacuum: "Städa", "Paus", "Docka", "Hem"  
- Media: Play/Pause, volym-slider
- Klimat: Temperatur +/-, Mode
- Övriga: enkel toggle som nu

Expanderad panel renderas som ett kort under pill-raden, ankrat till den aktiva pillen.

## 4. Energi-widget: ta bort sparkline från overlay

**Fil:** `src/components/home/cards/EnergyWidget.tsx`

Problemet: Expanded overlay (rad 104-120) visar `EnergySparkline` med peak-dots som ser ut som en gammal gauge. Fix: ta bort sparkline från overlay-widgeten (den hör hemma i dashboard-panelen, inte i HUD-overlays).

Expanded overlay ska istället visa:
- Watts + kWh
- Kostnad idag
- Ingen sparkline/gauge

## 5. LightMarkerLightOnly decay-fix

**Fil:** `src/components/devices/DeviceMarkers3D.tsx` (rad 1704-1706)

Ändra strip `decay` från `1.5` till `2` för att matcha LightMarker exakt:
```tsx
// Rad 1705: decay={1.5} → decay={2}
<pointLight ... decay={2} />
```

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeLayoutEditor.tsx` | Fix `setPointerCapture` på container |
| `src/components/home/CameraFab.tsx` | `flex-col-reverse` för uppåt-popup |
| `src/components/home/RoomNavigator.tsx` | `flex-col-reverse` för uppåt-popup |
| `src/components/home/HomeNav.tsx` | `flex-col-reverse` för uppåt-popup |
| `src/components/home/HomeView.tsx` | Expanderbara enhets-pills med snabbåtgärder |
| `src/components/home/cards/EnergyWidget.tsx` | Ta bort sparkline från overlay expanded |
| `src/components/devices/DeviceMarkers3D.tsx` | Strip decay 1.5 → 2 |

