# Performance & 3D

BJORQ renders a real-time 3D scene using WebGL (Three.js via React Three Fiber). Performance depends on your hardware, model complexity, and quality settings.

## Quality Levels

| Setting | DPR | Shadow Map | Antialiasing | Best For |
|---------|-----|-----------|-------------|----------|
| **Låg** | 1x | 512px | Off | Raspberry Pi, old tablets |
| **Medium** | 1.5x | 1024px | On | Modern tablets, mid-range PCs |
| **Hög** | 2x | 2048px | On | Desktop with dedicated GPU |

**DPR** (Device Pixel Ratio) controls rendering resolution. Higher = sharper but more demanding.

## Settings

### Skuggor (Shadows)

Enables real-time shadow mapping for the sun and lights. Adds significant GPU load — disable on weaker devices.

### Efterbearbetning (Postprocessing)

Adds screen-space effects like bloom and ambient occlusion. Demanding on mobile GPUs.

### Surfplatteläge (Tablet Mode)

One-click optimization that forces: Low quality, shadows off, postprocessing off. Ideal for wall-mounted tablets and Raspberry Pi kiosks.

## Performance Score

The **Prestanda** settings panel shows a computed load score (0–140):

| Score | Label | Meaning |
|-------|-------|---------|
| 0–40 | **Lätt** (green) | Low resource usage, runs on most devices |
| 41–75 | **Balanserad** (yellow) | Moderate load, good for mid-range hardware |
| 76+ | **Krävande** (red) | Heavy load, needs a capable GPU |

The score is calculated as:
- Base: Low = 30, Medium = 60, High = 100
- Shadows on: +25
- Postprocessing on: +15
- Tablet mode: overrides to 20

### Hardware Detection

The dashboard reads `navigator.hardwareConcurrency` (CPU cores) and `navigator.deviceMemory` (RAM, where available) to provide recommendations. If your score is high and your device has ≤4 cores or ≤4 GB RAM, you'll see a suggestion to lower quality.

## 3D Model Optimization

When you import a GLB/GLTF model, BJORQ analyzes it and shows:

- **Triangle count** — the main performance driver
- **Material count** — more materials = more draw calls
- **Texture count & max resolution** — large textures consume GPU memory

### Performance Ratings

| Rating | Triangles | Verdict |
|--------|-----------|---------|
| **OK** | < 100k | Runs smoothly on most devices |
| **Tung** | 100k–500k | May lag on tablets |
| **För tung** | > 500k | Consider simplifying the model |

### Tips for Better Performance

1. **Reduce triangle count** — use decimation in Blender before exporting
2. **Merge materials** — fewer materials = fewer draw calls
3. **Compress textures** — use 1024px or 512px textures instead of 4096px
4. **Use tablet mode** on Raspberry Pi and older tablets
5. **Disable shadows** if the scene feels sluggish
6. **Lower quality** from Hög to Medium for a good balance

## WebGL Context Loss

If the GPU runs out of memory or the browser reclaims resources, WebGL may lose its context. BJORQ handles this by:

- Detecting the `webglcontextlost` event
- Automatically attempting to restore the context
- Remounting the 3D Canvas if restoration fails

If you see a black 3D scene, try a hard reload (`Ctrl+Shift+R`).

## Canvas Remount

When you change quality, shadows, or postprocessing settings, the 3D Canvas is fully remounted (destroyed and recreated). This ensures all WebGL state is cleanly reconfigured. You'll see a brief flash — this is normal.
