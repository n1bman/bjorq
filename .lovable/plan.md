

# v1.3.1 Patch: Ljusarmaturer, kamera, kontrollpanel och widgets

## Översikt

Patchen åtgärdar 10 rapporterade problem i en sammanhållen uppdatering. Huvudområden: ljusarmaturer (state/rendering), kamerastabilitet, kontrollpanelsinteraktion och widget-robusthet.

---

## 1. Ljusarmaturer: korrekt default state + kontroll

**Problem:** `getDefaultState` i `useAppStore.ts` returnerar `generic` för `light-fixture`, vilket gör att brightness/color/on-off saknas.

**Fix:**
- `src/store/useAppStore.ts` rad 10–37: Lägg till `case 'light-fixture':` som returnerar samma `LightState` som `case 'light'`.
- `src/store/useAppStore.ts`: I `toggleDeviceState`, lägg till `'light-fixture'` i light-toggle-logiken.

## 2. Ljusarmaturer: modespecifik preview, emitter-fix, sänkt intensitet

**Problem:** Ljusarmaturer lyser alltid (även i Home/Dashboard), ljuskälla sitter fel för `led-bar`/`led-spot`, för hög intensitet.

**Fix i `DeviceMarkers3D.tsx`:**
- `LightFixtureMarker`: Ändra `isOn`-logik — tvingad preview (`true`) **enbart** i build mode. Läs `appMode` från store. I home/dashboard: respektera `lightData?.on`.
- `led-bar`: Flytta spotLight-origin till diffusorns mitt (`position={[0, -0.012, 0]}`), sänk intensity från `brightness * 4` till `brightness * 1.5`, distance `3`, angle `Math.PI / 4`.
- `led-spot`: Flytta spotLight-origin till lens-position (`position={[0, -0.008, 0]}`), sänk intensity från `brightness * 5` till `brightness * 2`, distance `2.5`, angle `Math.PI / 10`.
- `led-bulb`: Sänk pointLight intensity från `brightness * 2` till `brightness * 1`, distance `2`.
- Ta bort `castShadow` på fixture-spotlights (prestanda).

Samma fix i `LightMarker`: gör forced preview build-only.

## 3. Kategori-dimmer i kontrollpanelen

**Fix i `CategoryCard.tsx`:**
- Detektera om kategorin innehåller ljus-enheter (`kind === 'light' || kind === 'light-fixture'`).
- Om ja: visa en grupp-slider (0-255) i headern bredvid on/off-switch.
- Slider uppdaterar `brightness` för alla ljus-enheter i kategorin via `updateDeviceState`.

## 4. Home long-press popup: rik kontroll + HA-indikator

**Fix i `HomeView.tsx`:**
- Lägg till `'light-fixture'` och `'smart-outlet'` i `TOGGLEABLE_KINDS` och `KIND_ICONS`.
- Ersätt den manuella brightness-slidern i long-press popup med `<DeviceControlCard marker={longPressMarker} />` — detta ger automatiskt rätt kontroller (dimmer, färg, on/off) för alla enhetstyper.
- Lägg till HA-indikator i popup-headern: om `longPressMarker.ha?.entityId` finns, visa en liten grön Wifi-ikon.

## 5. Spara vy via long-press i 3D (Hemvy)

**Fix i `HomeView.tsx`:**
- Lägg long-press (800ms) handler på 3D-containern (`div.absolute.inset-0`).
- Vid long-press: visa en liten popup "Spara som startvy?" med Spara/Avbryt.
- Spara skriver `cameraRef.position` och `cameraRef.target` till `homeView.customStartPos/customStartTarget` via store.

## 6. Standby kameraskakning + vy-konflikt

**Rotorsak:** `StandbyStaticCamera` sätter kamera position varje frame, men `CameraController` kör lerp-logik parallellt i samma Canvas. Dessutom skriver standby-preview i DashboardGrid till samma `cameraRef` som huvudscenen.

**Fix i `Scene3D.tsx`:**
- I `CameraController`: returnera `<StandbyStaticCamera />` **före** OrbitControls-logiken (redan gjort rad 141-143). Men problemet är att `useFrame` i CameraController fortfarande körs och skriver till `cameraRef` + processar `pendingFlyTo`. Flytta `useFrame`-hooken **under** standby-guard:
  ```
  if (appMode === 'standby') return <StandbyStaticCamera />;
  // useFrame only runs when component is mounted — but CameraController still mounts useFrame
  ```
  Lösning: splitta till två separata komponenter — `StandbyCameraWrapper` och `InteractiveCameraController` — så att useFrame i den interaktiva inte körs under standby.

- `StandbyStaticCamera`: Lägg till lerp istället för hård set (eliminerar skakning):
  ```tsx
  camera.position.lerp(targetVec, delta * 5);
  // lookAt via target lerp
  ```

- Standby-preview i `DashboardGrid.tsx` (rad 418-419): Passera `preview`-prop till `Scene3D` som förhindrar skrivning till global `cameraRef`.

## 7. Widget-system stabilisering

**Fix i `DashboardGrid.tsx`:**
- `LIGHT_KINDS` set (rad 83): Lägg till `'light-fixture'` och `'smart-outlet'` så de grupperas korrekt i Hem-kategorin.
- `sortableItems` useMemo: Stabilisera widget-ID:n genom att prefixera rum-baserade grupper med `room-` och kind-baserade med `kind-` för att undvika ID-kollisioner.

## 8. Kamerahäng vid vy-byte

**Fix i `Scene3D.tsx` CameraController:**
- Vid `appMode`-byte: nollställ `lerpingTo.current` och sätt `initialApplied.current = false` om man byter TILL home/dashboard, så att den sparade startvy appliceras rent utan att konkurrera med en gammal lerp.
- Lägg till `useEffect` med `appMode` som dependency som rensar lerp-state.

## 9. Övriga kompletteringar

- `src/components/devices/DeviceMarkers3D.tsx` rad 1368-1370: Lägg till `'light-fixture'` och `'smart-outlet'` i `toggleableKinds`.
- `src/components/home/DashboardGrid.tsx` rad 60-68: Lägg till `'light-fixture'` och `'smart-outlet'` i `deviceFilters`.

---

## Sammanfattning av filändringar

| Fil | Ändringar |
|-----|-----------|
| `src/store/useAppStore.ts` | `getDefaultState`: light-fixture → LightState; toggleDeviceState: inkludera light-fixture |
| `src/components/devices/DeviceMarkers3D.tsx` | Modespecifik preview; emitter-positionering; sänkta intensiteter; toggleableKinds |
| `src/components/home/cards/CategoryCard.tsx` | Grupp-brightness-slider för ljuskategorier |
| `src/components/home/HomeView.tsx` | Rik DeviceControlCard i long-press; HA-ikon; nya typer i TOGGLEABLE_KINDS; 3D long-press spara vy |
| `src/components/Scene3D.tsx` | Separera standby/interaktiv kamera; lerp i standby; rensa lerp vid modebyte; preview-prop |
| `src/components/home/DashboardGrid.tsx` | LIGHT_KINDS utökat; stabila widget-ID; preview-prop på standby Scene3D |

