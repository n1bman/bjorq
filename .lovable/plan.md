

# Snygga upp widgets, fri placering, enhets-funktioner + scen-widget

## Problem

1. **Widgets kan inte placeras fritt på hela ytan** — drag-clamp stoppar vid y=85%, vilket gör att man inte kan flytta ner element tillräckligt. Enhets-pills och vacuum-panelen sitter fast i botten och syns inte i layoutläget.

2. **Device pills saknar funktionalitet** — vacuum, media, klimat hade tidigare expanderbara snabbåtgärder men de renderas bara i live-läge, inte som flyttbara widgets. Användaren vill kunna placera dessa fritt.

3. **Scener kan inte bli widgets** — `ScenesWidget` finns men är inte med i `HomeWidgetKey`-typen eller layoutsystemet.

4. **Visuell kvalitet** — device pills och expanderade paneler ser enkla ut, behöver renare glass-panel-stil som matchar övriga widgets.

---

## 1. Utöka HomeWidgetKey med `scenes` och `devices`

**Fil:** `src/store/types.ts` rad 843

Lägg till `'scenes' | 'devices'` i unionen:
```ts
export type HomeWidgetKey = 'clock' | 'weather' | 'temperature' | 'energy' | 'nav' | 'camera' | 'rooms' | 'scenes' | 'devices';
```

## 2. Utöka drag-gränser — y upp till 92%

**Fil:** `src/components/home/HomeLayoutEditor.tsx` rad 95

Ändra y-clamp från `85` till `92` så element kan placeras längre ner:
```ts
const newY = Math.max(1, Math.min(92, ...));
```

Samma i `HomeView.tsx` `getPos()` rad 116.

Lägg även till `scenes` och `devices` i:
- `DEFAULT_POSITIONS` (båda filerna)
- `WIDGET_WIDGETS` i HomeLayoutEditor
- `widgetRenderers` / `controlRenderers`

## 3. Scen-widget som flyttbar overlay

**Fil:** `src/components/home/HomeView.tsx`

- Importera `ScenesWidget`
- Lägg till `'scenes'` i `widgetKeys`-arrayen
- Lägg till renderer i `widgetComponents`
- Rendera med fri position som övriga widgets

**Fil:** `src/components/home/HomeLayoutEditor.tsx`

- Lägg till `{ key: 'scenes', label: 'Scener', hasSize: false }` i `WIDGET_WIDGETS`
- Lägg till placeholder-renderer i `controlRenderers`
- Default-position: `{ x: 3, y: 78 }`

## 4. Device pills som flyttbar widget

**Fil:** `src/components/home/HomeView.tsx`

- Flytta device-pill-raden + expanderade paneler till en positionerbar wrapper som styrs av `getPos('devices')`
- Behåll all befintlig funktionalitet (toggle, expand vacuum/climate/media)
- Default-position: `{ x: 3, y: 82 }`

## 5. Snygga upp device pills visuellt

**Fil:** `src/components/home/HomeView.tsx`

- Ge pill-wrappern `overlay-widget`-klass istället för bara `nn-widget` på expanderade paneler
- Avrunda pills mer: `rounded-xl` → matchar övriga widgets
- Expanderade paneler (vacuum/climate/media) får `glass-panel rounded-2xl` + subtil `backdrop-blur`
- Konsekvent spacing: `gap-2` mellan pills, `p-3` padding

## 6. Snygga upp ScenesWidget

**Fil:** `src/components/home/cards/ScenesWidget.tsx`

- Scen-knappar: `glass-panel rounded-xl` istället för `bg-surface-elevated/60`
- Behåll `overlay-widget` som wrapper
- Ikonen `scene.icon` kan vara emoji — byt till Lucide `Palette` per scen om ikon saknas

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | Lägg till `'scenes' \| 'devices'` i HomeWidgetKey |
| `src/components/home/HomeLayoutEditor.tsx` | Utöka drag-gräns y→92, lägg till scenes/devices i draggables |
| `src/components/home/HomeView.tsx` | Scener + devices som flyttbara widgets, snygga pills, utöka y-clamp |
| `src/components/home/cards/ScenesWidget.tsx` | Visuell uppfräschning med glass-panel |

