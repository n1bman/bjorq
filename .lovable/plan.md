

# Tre fixes: ljusarmaturer i hemvy, long-hold på 3D-markörer, LED-bar defaults

## 1. Ljusarmaturer av/på i hemvy

Undersökning visar att `light-fixture` redan finns i `toggleableKinds` och `getDefaultState` returnerar korrekt `LightState`. Problemet kan vara att **äldre placerade armaturer** har kvar ett `generic`-state utan `on`-property. Fix: lägg till en migration i `DeviceMarkers3D` som uppgraderar stale states vid rendering, och säkerställ att `LightFixtureMarker` alltid läser korrekt state.

**Fil:** `src/components/devices/DeviceMarkers3D.tsx`
- I `DeviceMarkers3D` huvudkomponent: lägg till en `useEffect` som itererar `markers` och för varje `light-fixture` med `generic`-state, anropar `setDeviceState(id, getDefaultState('light-fixture'))`.

**Fil:** `src/store/useAppStore.ts`
- I `toggleDeviceState`: lägg till explicit hantering för `light-fixture` (redan rätt via `'on' in current.data` men verifiera att den inte fastnar).

## 2. Long-hold på alla 3D-markörer i hemvy

Nuläge: Klick på 3D-markör togglar state. Long-press (500ms) finns bara på hemvyns bottom-cards. Användaren vill ha long-press på själva 3D-markörerna i scenen som öppnar samma kontrollpopup.

**Fil:** `src/components/devices/DeviceMarkers3D.tsx`
- Lägg till `onLongPress`-callback prop på `DeviceMarkers3D`.
- I `handleSelect`: starta en 500ms timer. Om timern löper ut → anropa `onLongPress(id)` istället för toggle. Om pointer up innan → toggle som vanligt.
- Ny ref: `longPressTimer`, `longPressTriggered`.
- Ny `handlePointerUp` som rensar timern.

**Fil:** `src/components/home/HomeView.tsx`
- Passera `onLongPress={(id) => setLongPressId(id)}` till `Scene3D` → `DeviceMarkers3D`.
- Behåll befintlig long-press popup (rad 100-123) som redan renderar `DeviceControlCard`.

**Fil:** `src/components/Scene3D.tsx`
- Acceptera och vidarebefordra `onLongPress` prop till `DeviceMarkers3D`.

## 3. LED-bar defaults: 0.5x / 1.4m / 118° / 0.70

Ändra default-värden för `led-bar` på **två ställen**:

**Fil:** `src/components/devices/DeviceMarkers3D.tsx` (rad 1228)
```
'led-bar': { intensity: 0.5, distance: 1.4, angle: (118 * Math.PI) / 180, penumbra: 0.7 }
```

**Fil:** `src/components/build/BuildInspector.tsx` (rad 1280)
```
'led-bar': { intensity: 0.5, distance: 1.4, angle: (118 * Math.PI) / 180, penumbra: 0.7 }
```

## Sammanfattning filändringar

| Fil | Ändring |
|-----|---------|
| `DeviceMarkers3D.tsx` | State-migration för light-fixture; long-press handler; LED-bar defaults |
| `HomeView.tsx` | Passera `onLongPress` till Scene3D |
| `Scene3D.tsx` | Vidarebefordra `onLongPress` prop |
| `BuildInspector.tsx` | LED-bar defaults |

