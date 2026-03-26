

# Fix: Ljusbugg vid döljning av markörer + Scenikon-färgväljare

## Problem 1: Ljuset ändras vid döljning/visning av markörer

**Rotorsak:** `LightMarkerLightOnly` (rad 1658-1659) har en annan `lightColor`-logik än `LightMarker` (rad 48-50):

- **LightMarker:** `if (!isOn) → grey; if (!lightData) → warm yellow (#f5c542)`
- **LightMarkerLightOnly:** `if (!lightData || !isOn) → grey (#555555)`

När `isOn=true` men `lightData=null` (ingen explicit state), ger LightMarker varmt gult ljus men LightMarkerLightOnly ger grått. Resultat: döljning → ljuset slocknar/ändras.

**Fix:** Synka `lightColor`-logiken i `LightMarkerLightOnly` med `LightMarker` — exakt samma useMemo:

```tsx
// rad 1658-1666, ändra till:
const lightColor = useMemo(() => {
  if (!isOn) return new THREE.Color('#555555');
  if (!lightData) return new THREE.Color('#f5c542'); // warm preview — same as LightMarker
  if (lightData.colorMode === 'rgb' && lightData.rgbColor) {
    return new THREE.Color(lightData.rgbColor[0] / 255, lightData.rgbColor[1] / 255, lightData.rgbColor[2] / 255);
  }
  if (lightData.colorMode === 'temp' && lightData.colorTemp) {
    return miredsToColor(lightData.colorTemp);
  }
  return new THREE.Color('#f5c542');
}, [lightData?.colorMode, lightData?.rgbColor?.[0], lightData?.rgbColor?.[1], lightData?.rgbColor?.[2], lightData?.colorTemp, isOn, hasState]);
```

---

## Problem 2: Ingen färgväljare för scenikoner

Användaren vill välja egen färg på den valda scenikonen för bättre visuell identitet.

**Fix:**
1. Lägg till `iconColor?: string` i `SavedScene` (types.ts)
2. I `SceneForm` (ScenesPanel.tsx):
   - Lägg till `iconColor` state
   - Under ikonväljaren, lägg till en rad med 8-10 färgcirklar + en input type="color" för fri färg
   - Spara `iconColor` i scene-objektet
3. Överallt scenikonen renderas, applicera `style={{ color: scene.iconColor }}` om satt

**Färgval-rad under ikonväljaren:**
```
○ vit  ○ guld  ○ röd  ○ blå  ○ grön  ○ lila  ○ rosa  ○ [custom picker]
```

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/devices/DeviceMarkers3D.tsx` | Synka lightColor-logiken i LightMarkerLightOnly med LightMarker |
| `src/store/types.ts` | Lägg till `iconColor?: string` i SavedScene |
| `src/components/home/cards/ScenesPanel.tsx` | Färgväljare under ikonväljaren, spara/läs iconColor |

