

# V1 Model Optimization Pipeline

## Summary

Add real client-side optimization to the import workflow: texture downscaling, material deduplication, scene cleanup, and GLB re-export. Users choose between importing original or optimized version, with before/after comparison.

## File Changes

### 1. `src/store/types.ts` — Add `maxTextureRes` to stats

Add `maxTextureRes?: number` field to `AssetPerformanceStats` (line 568) so we can track texture resolution in before/after comparisons.

### 2. `src/lib/assetPipeline.ts` — Add optimization functions

**Update `processModel`** to also capture `maxTextureRes` in returned stats (already computed as `maxTexRes` but not returned).

**New: `getOptimizationLevel(stats)`** — Returns `'ok' | 'recommended' | 'strongly-recommended'` based on:
- OK: <150k tri, <5MB, textures ≤2048
- Recommended: >150k tri OR >5MB OR textures >2048
- Strongly recommended: >500k tri OR >10MB OR textures >4096

**New: `OptimizationResult` interface**:
```typescript
{
  scene: THREE.Group;
  blob: Blob;
  stats: AssetPerformanceStats;
  beforeStats: AssetPerformanceStats;
  thumbnail: string;
  savings: { fileSizePct: number; materialsPct: number; texResPct: number };
}
```

**New: `optimizeModel(scene, originalStats, options?)`** — Performs:
1. **Texture downscaling** (max 1024px) — uses existing `downscaleTexture` helper on all maps
2. **Safe JPEG conversion** — only for `map` property where material has `transparent === false` and no `alphaMap`. Uses canvas `toDataURL('image/jpeg', 0.85)` for quality. Normal/roughness/metalness/AO/emissive maps stay as-is (PNG via canvas).
3. **Material deduplication** — key = `color.getHex() + roughness + metalness + map-uuid + normalMap-uuid`. Materials with identical keys share a single instance. Only reassigns `child.material`, no geometry changes.
4. **Scene cleanup** — traverse and remove: empty groups (no mesh children), embedded cameras (`THREE.Camera`), embedded lights (`THREE.Light`), animation clips (set `gltf.animations = []`).
5. **Unused vertex attribute stripping** — remove `uv2` if no material in the scene uses `aoMap`. Remove `color` attribute if no material uses `vertexColors`. Conservative: check usage across all materials first.
6. **No geometry merging** — meshes stay intact to preserve structure.

**New: `exportToGLB(scene): Promise<Blob>`** — Uses `GLTFExporter` from `three/examples/jsm/exporters/GLTFExporter.js` to serialize scene to binary GLB blob.

After optimization, re-analyze the scene to get accurate `afterStats`, then generate a new thumbnail.

### 3. `src/components/build/BuildModeV2.tsx` — Updated import dialog

**New state variables** (in `AssetCatalog`):
- `optimizedResult: OptimizationResult | null`
- `isOptimizing: boolean`
- `optimizationStep: 'analyze' | 'optimizing' | 'optimized'`

**Dialog flow changes** (lines 356-390):

**Step 1 — Analysis complete**: Show thumbnail, stats, name/category/subcategory fields (same as now), plus optimization recommendation:

| Level | UI |
|---|---|
| OK | Green box: "Bra — redo att använda". Buttons: `[Avbryt] [Importera]`. Small text link: "Optimera ändå" |
| Rekommenderas | Yellow box: "Optimering rekommenderas — minskar filstorlek och texturer. Triangelantal påverkas inte nämnvärt." Buttons: `[Avbryt] [Importera original] [Optimera & importera]` |
| Starkt rekommenderad | Red box: "Optimering starkt rekommenderad — stor fil och/eller tunga texturer kan ge låg FPS." Buttons: `[Avbryt] [Importera original] [Optimera & importera]` |

**Step 2 — Optimizing**: Spinner with message "Optimerar... Skalar ner texturer, rensar tomma noder..."

**Step 3 — Optimized**: Show before/after comparison table:

```
           Före        Efter
Storlek    16.5 MB     4.2 MB    -74%
Texturer   4096 px     1024 px   -75%
Material   10          6         -40%
Trianglar  243k        243k       0%
```

Green/red percentage indicators. Buttons: `[Avbryt] [Importera]`

**`handleImportConfirm` update**: If `optimizedResult` exists, use `optimizedResult.blob` as the file source (create a `new File([blob], importName + '.glb')`) and `optimizedResult.stats` as performance data. Otherwise use original `importFile`.

**Fallback**: Wrap the optimize call in try/catch. On failure:
- Show toast: "Optimering misslyckades — du kan fortfarande importera originalet, men det kan påverka prestanda"
- Reset to `optimizationStep: 'analyze'` so user can click "Importera original"
- All metadata (name, category, subcategory) preserved

**Keep metadata fields visible** throughout all steps — name, category, subcategory inputs remain editable. The `saveToCatalog` checkbox and hosted-mode logic stays unchanged.

## What V1 does NOT do
- No geometry merging or decimation
- No lossy mesh simplification  
- Triangle count stays the same (UI states this clearly)
- Original file not stored separately (user can re-import from disk)

