

# Solljus genom fönster — varför det saknas och fix

## Problem

Imported 3D-modeller har **`castShadow: false`** på ALLA meshes (rad 73 och 123 i `ImportedHome3D.tsx`). Det betyder att husets väggar och tak **inte blockerar solljuset alls**. Resultatet: jämnt ljus överallt, inga ljusmönster genom fönster, inga skuggor inomhus.

För att se solljus genom fönster behöver väggar och tak **kasta skuggor** (blockera ljuset), medan glas/fönster-material **inte kastar skuggor** (släpper igenom ljuset). Skillnaden i ljus/skugga skapar "ljusinsläppet".

## Lösning

Aktivera `castShadow` selektivt på importerade modeller: **opaka meshes kastar skuggor, transparenta/glas-meshes gör det inte**.

### `ImportedHome3D.tsx` — ändring i mesh-traversal

Byt från:
```typescript
child.castShadow = false;
```

Till intelligent material-baserad logik:
```typescript
const isGlass = child.material.transparent 
  || child.material.opacity < 0.9
  || /glass|window|glas|fönster/i.test(child.material.name || child.name);
child.castShadow = shadowsEnabled && !isGlass;
```

Denna logik körs i **båda** ställena — initial load (rad 71-87) och re-apply effect (rad 119-143).

### Ceilings3D — samverkan

För **byggda rum** fungerar systemet redan: Ceilings3D kastar skuggor (osynligt tak som blockerar sol), väggar kastar skuggor, och fönsteröppningar i väggar släpper igenom ljus. Ingen ändring behövs här.

### Filer

| Fil | Ändring |
|-----|--------|
| `src/components/build/ImportedHome3D.tsx` | `castShadow` = true för opaka meshes, false för glas/transparenta |

