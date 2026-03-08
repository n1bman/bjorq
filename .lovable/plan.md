

# Fix: Props3D "Laddar..." + lag vid uppladdning av möbler

## Problem

Två allvarliga prestandaproblem i `Props3D.tsx`:

### 1. `scene.clone()` körs på VARJE React-render (rad 311)
Varje gång React renderar om (musflytt, state-ändring, etc.) klonas hela 3D-scenen inklusive alla meshes, geometrier och material. För en modell som KIVIK (som troligen har tiotusentals trianglar) innebär detta att GPU-minnet fylls och main thread blockeras — därav laggen.

### 2. Base64-läsning blockerar main thread (FurnishCatalog)
`FileReader.readAsDataURL` läser hela GLB-filen till en base64-sträng på main thread. En 10 MB GLB-fil blir ~13 MB base64 som sedan lagras i Zustand-storen (och synkas till localStorage), vilket fryser UI:t.

### 3. Ingen storleksgräns eller varning
Användaren kan ladda upp en godtyckligt stor modell utan feedback om den är för tung.

## Lösning

### `src/components/build/Props3D.tsx`

1. **Memoisera scen-klonen** — flytta `scene.clone()` + traversal till en `useMemo` som bara körs om `scene` eller `isSelected` ändras, inte på varje render.

2. **Visa modelstats efter laddning** — logga en toast med triangelantal och betyg så användaren vet om modellen är tung.

3. **Maxgräns för fileData** — om base64 > 4 MB, spara INTE fileData i katalogen (blob URL funkar under sessionen, men modellen överlever inte sidladdning). Logga en varning.

### `src/components/build/BuildModeV2.tsx` (FurnishCatalog)

1. **Filstorleksvarning** — om filen > 10 MB, visa toast-varning med info om att modellen kan vara tung.
2. **Skippa base64 för stora filer** — om filen > 4 MB, skapa bara blob URL utan att läsa FileReader (sparar main thread).
3. **Visa triangelbetyg i katalogen** efter att modellen laddats.

## Ändringar

### `src/components/build/Props3D.tsx`

```typescript
// BEFORE (line 311 — runs every render):
const clonedScene = scene.clone();
clonedScene.traverse(...)

// AFTER — memoized:
const displayScene = useMemo(() => {
  if (!scene) return null;
  const clone = scene.clone();
  clone.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = true;
      if (isSelected) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color('#4a9eff');
        child.material.emissiveIntensity = 0.3;
      }
    }
  });
  return clone;
}, [scene, isSelected]);

if (!displayScene) return null;
// use displayScene in <primitive object={displayScene} ... />
```

### `src/components/build/BuildModeV2.tsx` (FurnishCatalog.handleUpload)

```typescript
const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const MAX_FILE_DATA = 4 * 1024 * 1024; // 4 MB
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('Stor fil (>10 MB) — modellen kan vara tung att rendera');
  }

  const blobUrl = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/, '');

  if (file.size <= MAX_FILE_DATA) {
    // Read base64 for persistence
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      useAppStore.getState().addToCatalog({ ... fileData: base64 ... });
    };
    reader.readAsDataURL(file);
  } else {
    // Too large for localStorage — blob-only (session lifetime)
    useAppStore.getState().addToCatalog({ ... url: blobUrl, source: 'user' ... });
    toast.info('Modellen är stor och sparas bara under denna session');
  }
  e.target.value = '';
};
```

## Filer

| Fil | Ändring |
|-----|---------|
| `src/components/build/Props3D.tsx` | Memoisera scene.clone(), toast vid laddning |
| `src/components/build/BuildModeV2.tsx` | Filstorleksgräns, skippa base64 för stora filer |

