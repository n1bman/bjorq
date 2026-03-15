

# Buggfixar och förbättringar — 9 punkter

## Översikt

Nio problem har identifierats som spänner över ljussättning, 3D-modellhantering, UI-interaktion och kamerabeteende. Planen är uppdelad i logiska arbetsblock.

---

## 1. Platt solljus / överexponerade väggar

**Problem:** Ljuset känns platt och väggar är överexponerade.

**Orsak:** I `environmentEngine.ts` multipliceras `ambientIntensity` med `atmosphereIntensity` (rad 279), men `hemisphereIntensity` multipliceras med `indoorBounce` som har minimum 0.35 (rad 225). Vid klart väder ger CLEAR-profilen `sunIntensity: 1.1` + `ambientIntensity: 0.40` + `hemisphereIntensity: 0.45` — kombinerat med indoorBounce och atmosphere-multiplikatorer blir det för ljust och platt.

**Åtgärd:**
- `environmentEngine.ts`: Sänk CLEAR-profilens `ambientIntensity` 0.40 → 0.30, `hemisphereIntensity` 0.45 → 0.35, höj `sunIntensity` 1.1 → 1.4 för tydligare riktningsljus och kontrast.
- Justera `hemisphereSkyColor` till en kallare ton för att motverka uttvättad känsla.
- `Scene3D.tsx`: Öka `shadow-camera` frustum och sänk `shadow-bias` för skarpare skuggor.

---

## 2. 3D-modell (skåp) hanterar inte omgivningsljus

**Problem:** Importerad modell tar inte emot ljus korrekt (ser helt svart ut förutom lampor).

**Orsak:** I `Props3D.tsx` rad 373-374 sätts `child.castShadow = false; child.receiveShadow = true;` — men det klonade materialet kan ha `metalness: 1` eller felaktiga PBR-värden som gör att det absorberar allt diffust ljus. Dessutom klonas materialet vid varje renderloop.

**Åtgärd:**
- `Props3D.tsx` `displayScene`: Efter kloning, kontrollera och korrigera extrema materialvärden. Om `metalness > 0.95` och ingen metallkänsla-override finns, sänk till 0.5. Om `roughness < 0.05`, höj till 0.3. Lägg till `child.material.envMapIntensity = 1.0` och säkerställ `child.material.needsUpdate = true`.

---

## 3. Emissive-highlight vid markering av möbel — byt till blå box

**Problem:** Emissive-highlight (#d4a574) gör det omöjligt att se färgändringar.

**Åtgärd:**
- `Props3D.tsx` rad 390-396: Ta bort emissive-highlight helt (både `isSelected` och `isHovered` blocken).
- `Props3D.tsx` rad 498-504: Ändra selection wireframe från vit till blå (`#4a9eff`), öka `linewidth` till 2, höj opacity till 0.9.

---

## 4. Placering: Fri som default + golv-genomträngning + long-press Fri funkar inte

**Problem:** Modeller med "golv"-inställning hamnar under golvet. Long-press "Fri"-knappen fungerar inte.

**Åtgärd:**
- `placementEngine.ts` `findLandingPosition`: I slutet av funktionen (fallback), clamp Y till `Math.max(floorElevation, currentY)`. Gör detsamma i `placement === 'floor'`-grenen.
- `Props3D.tsx` `handleToggleFreePlacement` (rad 361-365): Undersök och fixa — nuvarande kod sätter `freePlacement` men `placementEngine` kollar `propItem.freePlacement` korrekt. Problemet kan vara att catalog-item `placement` fortfarande styr. Lägg till explicit logik: om `freePlacement === true`, skippa alla collision checks och placement rules helt.
- Ändra default placement i `addProp` till `freePlacement: true`.
- Fixa long-press-menyns knappar (Rotera, Duplicera, Ta bort, Fri) — de fungerar troligen inte pga att `onClick` stoppas av event-hanteringen. Flytta `e.stopPropagation()` och säkerställ att Html-klick propageras korrekt.

---

## 5. Duplicera-knapp i device-inspektör + numerisk input + ta bort Yta/Kategori

**Åtgärd:**
- `BuildInspector.tsx` `DeviceInspector`: Lägg till en "Duplicera"-knapp (kopierar marker med offset +0.5 X).
- Byt ut alla position/rotation `Slider` mot `SliderWithInput` (redan importerad) i `DeviceInspector`.
- Ta bort "Yta"-dropdown (rad 1418-1430) och "Kategori"-input (rad 1432-1441) från DeviceInspector.

---

## 6. 3D-vy i Grafik & Miljö-inställningar

**Problem:** Man ser inte effekten av ändringar direkt.

**Åtgärd:**
- `DashboardGrid.tsx`: I rendering-sektionen, lägg till en inline `<Scene3D>` preview-widget (kompakt, ~250px hög) ovanför GraphicsSettings. Wrappa i en Container med begränsad höjd. Använd en mini-Canvas med samma SceneContent som huvudscenen men utan interaktiva kontroller.

---

## 7. Väder pulserar — bättre realism

**Problem:** Partiklar spawnar i pulser istället för jämnt.

**Åtgärd:**
- `WeatherEffects3D.tsx`: Problemet är att `positions` återskapas via `useMemo` med `count` som beroende, vilket ger en "burst". Randomisera initiala Y-positioner jämnt (0 till MAX_HEIGHT). Lägg till variation i fallhastigheten per partikel (±20%). Lägg till liten XZ-drift för regn. Låt `intensity` driva count mer gradvis genom att bara ändra count när diff > 10%.

---

## 8. Kamera hänger sig vid byte mellan lägen

**Problem:** Kameran "snäpper tillbaka" vid byte från Design till Hem-vy.

**Åtgärd:**
- `Scene3D.tsx` `CameraController`: Vid `appMode`-byte, bevara kamerans nuvarande position istället för att trigga lerp till preset. Lägg till en `useEffect` som, vid byte från `build` till `home`, sätter `lerpingTo` baserat på den sparade `customStartPos/Target` — men INTE om `cameraPreset === 'free'`. I `InteractiveCameraController`, skippa initialApplied-logiken om det redan finns en aktiv kameraposition.

---

## 9. Enhetsmarkörer: dölj bara hjälpsfär-enheter + större ögonikon

**Problem:** Användaren vill bara kunna dölja enheter som har en "hjälpsfär" (generiska markörer), inte de med 3D-modeller (ljusarmaturer, speakers, soundbar, etc.).

**Åtgärd:**
- `HomeView.tsx`: Definiera en `Set` med DeviceKinds som har 3D-modeller: `light-fixture`, `speaker`, `soundbar`, `smart-outlet`, `vacuum`, `light`, `switch`, `sensor`, `climate`. Filtrera `markers` i picker-listan så att bara enheter som INTE har 3D-modeller (dvs. GenericMarker-typer) visas.
- Ögonikon: Ändra `<Eye size={16} />` till `<Eye size={20} />` och öka knappens storlek från `w-10 h-10` till `w-12 h-12`.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/lib/environmentEngine.ts` | Justera CLEAR-profil, hemisphere-färger |
| `src/components/Scene3D.tsx` | Skuggor, kamera-modeövergång |
| `src/components/build/Props3D.tsx` | Material-fix, emissive bort, blå box, freePlacement default |
| `src/lib/placementEngine.ts` | Floor elevation clamp, freePlacement bypass |
| `src/components/build/BuildInspector.tsx` | Duplicera-knapp, SliderWithInput, ta bort Yta/Kategori |
| `src/components/build/WeatherEffects3D.tsx` | Jämn partikelfördelning, hastighetsvariation |
| `src/components/home/HomeView.tsx` | Filtrera dölj-lista, större ögonikon |
| `src/components/home/DashboardGrid.tsx` | 3D-preview i grafik-inställningar |
| `package.json` + `config.yaml` + `README.md` + `CHANGELOG.md` | Version bump till 1.5.3 |

