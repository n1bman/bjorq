

# Textur & färg för importerade möbler

## Texturfrågan

KIVIK-modellen rapporterar **1 material** — det är troligt att modellen exporterades med en enkel färg/PBR-material utan inbakad textur-bild. GLB-formatet bäddar in texturer i binären och `loader.parse()` hanterar dessa korrekt. Om modellen saknar textur i originalfilen kommer den inte heller att ha det här. Det är alltså inte en bugg utan modellens innehåll.

## Lösning — färg- och texturöverlägg för möbler

Lägg till möjligheten att applicera egen färg eller textur på importerade 3D-modeller direkt i inspektören.

### Datamodell (`src/store/types.ts`)

Utöka `PropItem` med:
```typescript
export interface PropItem {
  // ... existing fields ...
  colorOverride?: string;      // hex färg att applicera
  textureOverride?: string;    // base64 data URL för textur-bild
  textureScale?: number;       // UV-repeat (default 1)
  metalness?: number;          // 0-1
  roughness?: number;          // 0-1
}
```

### 3D-rendering (`src/components/build/Props3D.tsx`)

I `displayScene` useMemo — om `colorOverride` eller `textureOverride` finns, applicera på alla meshes:

```typescript
const displayScene = useMemo(() => {
  if (!scene) return null;
  const clone = scene.clone();
  clone.traverse((child: any) => {
    if (child.isMesh) {
      // Always clone material so original is untouched
      child.material = child.material.clone();
      
      if (colorOverride) {
        child.material.color = new THREE.Color(colorOverride);
      }
      if (textureOverride) {
        const tex = new THREE.TextureLoader().load(textureOverride);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(textureScale, textureScale);
        child.material.map = tex;
        child.material.needsUpdate = true;
      }
      if (roughness !== undefined) child.material.roughness = roughness;
      if (metalness !== undefined) child.material.metalness = metalness;
      
      if (isSelected) {
        child.material.emissive = new THREE.Color('#4a9eff');
        child.material.emissiveIntensity = 0.3;
      }
    }
  });
  return clone;
}, [scene, isSelected, colorOverride, textureOverride, textureScale, roughness, metalness]);
```

### PropInspector (`src/components/build/BuildInspector.tsx`)

Lägg till i PropInspector efter skala-sektionen:

- **Färgväljare** — en `<input type="color">` för att välja färg + en "Återställ"-knapp
- **Textur-uppladdning** — knapp för att ladda upp en bild (jpg/png), konverteras till base64 data URL, sparas i `textureOverride`
- **Texturskala-slider** — 0.1–10, styr UV-repeat
- **Material-sliders** — roughness (0–1) och metalness (0–1)

### Filer

| Fil | Ändring |
|-----|--------|
| `src/store/types.ts` | Lägg till `colorOverride`, `textureOverride`, `textureScale`, `metalness`, `roughness` i `PropItem` |
| `src/components/build/Props3D.tsx` | Applicera färg/textur-överlägg i `displayScene` useMemo |
| `src/components/build/BuildInspector.tsx` | Färgväljare, texturuppladdning och material-sliders i PropInspector |
| `src/components/build/furnish/FurnishTools.tsx` | Visa färgprick i placerade-listan om `colorOverride` finns |

