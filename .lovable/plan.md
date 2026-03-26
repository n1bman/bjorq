

# Hemvy: Gör alla element flyttbara + flytta "Anpassa"-knappen

## Problem

1. **HomeNav (center FAB)**, **CameraFab** och **RoomNavigator** kan inte flyttas i layoutläget — bara de 4 widgetarna (klocka, väder, temperatur, energi) är draggable.
2. **"Anpassa"-knappen** ligger dold bakom/under HomeNav-knappen nere till höger — dålig placering, svår att hitta.
3. **RoomNavigator har en emoji kvar** (`📷` rad 73).

## Plan

### 1. Utöka `HomeWidgetKey` med nya element

**Fil:** `src/store/types.ts`

Ändra typen:
```
export type HomeWidgetKey = 'clock' | 'weather' | 'temperature' | 'energy' | 'nav' | 'camera' | 'rooms';
```

Lägg till default-positioner i HomeView och HomeLayoutEditor:
- `nav`: `{ x: 46, y: 90 }` (center bottom, som nu)
- `camera`: `{ x: 92, y: 80 }` (bottom right, som nu)
- `rooms`: `{ x: 85, y: 80 }` (near camera, som nu)

Dessa tre nya element behöver inte storlekar (de har fast utseende) — layout-editorn visar dem utan storleksväljare.

### 2. Gör HomeNav, CameraFab och RoomNavigator positionerbara

**Filer:** `src/components/home/HomeView.tsx`, `src/components/home/HomeNav.tsx`, `src/components/home/CameraFab.tsx`, `src/components/home/RoomNavigator.tsx`

- HomeView skickar `style={{ left, top }}` till varje element baserat på `widgetLayout['nav']`, `widgetLayout['camera']`, `widgetLayout['rooms']`
- Varje komponent byter från `fixed bottom-X right-X` till att acceptera en `style`-prop med absolut position
- I layoutläge renderas de i HomeLayoutEditor med drag handles, precis som widgetarna — men utan storleksval

### 3. Lägg till dem i HomeLayoutEditor

**Fil:** `src/components/home/HomeLayoutEditor.tsx`

- Utöka `WIDGETS`-arrayen med `{ key: 'nav', label: 'Navigering' }`, `{ key: 'camera', label: 'Kamera' }`, `{ key: 'rooms', label: 'Rum' }`
- Dessa renderar sin faktiska komponent inuti drag-ramen
- Dölj storleksväljaren för dessa tre (de har ingen size-option)
- Dölj synlighets-toggle för `nav` (den ska alltid vara synlig)

### 4. Flytta "Anpassa"-knappen till övre vänstra hörnet

**Fil:** `src/components/home/HomeView.tsx`

Byt från `absolute bottom-28 right-20` till `fixed top-4 left-4` och gör den till en minimal triangel/hörn-indikator:
- Liten cirkulär eller triangulär knapp i övre vänstra hörnet
- Enbart `Settings2`-ikon, ingen text (text visas on hover/tap som tooltip)
- Subtil glassmorphism-stil som resten av HUD:en

### 5. Emoji-fix i RoomNavigator

**Fil:** `src/components/home/RoomNavigator.tsx`
- Rad 73: Byt `📷` → Lucide `Camera`-ikon

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `HomeWidgetKey` += `'nav' \| 'camera' \| 'rooms'` |
| `src/components/home/HomeView.tsx` | Positionera nav/camera/rooms via widgetLayout, flytta Anpassa-knapp till top-left |
| `src/components/home/HomeNav.tsx` | Acceptera `style`-prop, ta bort `fixed` positionering |
| `src/components/home/CameraFab.tsx` | Acceptera `style`-prop, ta bort `fixed` positionering |
| `src/components/home/RoomNavigator.tsx` | Acceptera `style`-prop, ta bort `fixed` positionering, emoji-fix |
| `src/components/home/HomeLayoutEditor.tsx` | Lägg till nav/camera/rooms som draggable element utan storleksval |

