

# Fix: Layoutläge för fler element + widget-storlek i layoutläge + ljusbugg vid döljning

## Problem

1. **Enhetsmarkörer-knappen och Anpassa-knappen saknas i layoutläget** — de har fasta positioner (`fixed top-4 left-4` / `fixed top-5 right-5`) och kan inte dras.

2. **Enhets-widgets (vacuum, TV, etc.) visas i sin fullstorlek i layoutläget** — men deras representation i `HomeLayoutEditor` är bara en liten pill med ikon+namn. I layoutläget bör de visas i sin riktiga storlek så man ser hur mycket yta de tar.

3. **Ljusstyrka ändras vid döljning av markörer** — `LightMarkerLightOnly` rad 1652 har `const isOn = lightData?.on ?? false` (default OFF). `LightMarker` rad 41 har `const isOn = hasState ? (lightData?.on ?? false) : true` (default ON). När man döljer en markör som saknar explicit state byter den från ON → OFF, vilket ändrar ljuset.

---

## Fix 1: Lägg till Enhetsmarkörer-knapp och Anpassa-knapp i layoutläget

**`HomeLayoutEditor.tsx`**:
- Lägg till `'markerPicker'` och `'layoutButton'` i `WIDGET_WIDGETS` (eller som separata draggables).
- Ge dem defaultpositioner: `markerPicker: { x: 90, y: 3 }`, `layoutButton: { x: 2, y: 2 }`.
- Rendera dem som ikoner (Eye-ikon resp. Settings2-ikon) med drag-label.

**`HomeView.tsx`**:
- Enhetsmarkörer-knappen (rad 369) och Anpassa-knappen (rad 159): läs position från `widgetLayout['markerPicker']` / `widgetLayout['layoutButton']` istf. `fixed top-5 right-5` / `fixed top-4 left-4`.
- Byt till `absolute` med `left: x%`, `top: y%`.

**`DEFAULT_POSITIONS`** i båda filer:
```
markerPicker: { x: 92, y: 3 },
layoutButton: { x: 2, y: 2 },
```

## Fix 2: Visa enhets-widgets i riktig storlek i layoutläget

**`HomeLayoutEditor.tsx`** rad 210-262:

Idag renderas device-widgets som en pill:
```tsx
<div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 ...">
  <Icon size={16} /> <span>{m.name}</span>
</div>
```

Ersätt med att rendera samma kort-design som `HomeView` — med header + typ-specifika kontroller (vacuum-knappar, media-knappar, etc.) men i en icke-interaktiv version (bara visuellt). Alternativt: gör kortet bredare (`min-w-[180px]`) med en extra rad som visar enhetstypen.

Enklaste approach: ge kortet samma `min-w-[180px] max-w-[260px]` och lägg till en statusrad per typ:
- vacuum: "Städa · Paus · Stopp · Docka"
- media_screen: "⏮ ▶ ⏭ ⏹"
- speaker: "▶ Vol −/+"
- light: en grå slider-mock
- fan: "Låg · Med · Hög"
- default: "Av/På"

## Fix 3: Ljusbugg — `LightMarkerLightOnly` default isOn

**`DeviceMarkers3D.tsx`** rad 1648-1652:

Ändra:
```tsx
const lightData = state?.kind === 'light' ? state.data : null;
const isOn = lightData?.on ?? false;
```
Till:
```tsx
const hasState = state?.kind === 'light';
const lightData = hasState ? state.data : null;
const isOn = hasState ? (lightData?.on ?? false) : true;
```

Identisk logik som `LightMarker` (rad 39-41). Nu behåller dolda markörer samma ljus som synliga.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeLayoutEditor.tsx` | Lägg till markerPicker + layoutButton som draggables, gör device-kort större |
| `src/components/home/HomeView.tsx` | Positionera markerPicker + layoutButton via widgetLayout |
| `src/components/devices/DeviceMarkers3D.tsx` | Fix `LightMarkerLightOnly` isOn default till `true` |

