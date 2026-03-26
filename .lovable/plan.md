

# Ersätt 3 RGB-sliders med en enda hue/färg-slider

## Vad du vill
En enda lång slider med hela färgspektrumet (regnbåge) — vitt i mitten. Tar mycket mindre plats än tre separata R/G/B-sliders.

## Teknisk approach

**Fil: `DeviceControlCard.tsx`** — rad 325-370

Ersätt hela RGB-blocket (3 sliders + preview) med:

1. **En enda spektrum-slider** med bakgrund:
   ```
   linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #ffffff, #00ffff, #0000ff, #ff00ff, #ff0000)
   ```
   Vitt i mitten (position ~50%), regnbågsfärger runtom.

2. **Slider value 0–360** som representerar position på spektrumet. Position 180 = vitt.

3. **Konverteringslogik:**
   - 0–180: hue 0→360 med full saturation, mappas till RGB
   - ~180: vitt (saturation → 0)
   - Enkel mapping-funktion som tar slider-värde → RGB

4. **Liten färgpreview-cirkel** bredvid slidern (behålls, men inline)

5. **Layout:** En rad — gradient-bakgrund + slider + preview-dot. Tar ca 40px höjd istället för ~120px.

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `DeviceControlCard.tsx` | Ersätt 3 RGB-sliders (rad 325-370) med en spektrum-slider |

