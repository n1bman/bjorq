

# Fix: 3D-modeller laddas aldrig — blob URLs fungerar inte i sandboxen

## Rotorsak

Blob URLs (`blob:https://...`) fungerar **inte** i Lovable-sandboxmiljön — varken `fetch()` eller `XMLHttpRequest` kan läsa dem. Loggen visar:
- Hundratals `HEAD blob:...` requests som alla misslyckas med "Failed to fetch"
- `XHR network error` vid varje försök att ladda modellen
- Modellen fastnar i en oändlig loop mellan "Laddar..." och "Kunde inte ladda"

Tidigare fungerade detta troligen i en annan miljö (lokal server) där blob URLs stöds.

## Lösning

Skippa blob URLs helt. Ladda modeller direkt från **base64 fileData** via `loader.parse(ArrayBuffer)` — ingen nätverksförfrågan behövs.

### `src/components/build/Props3D.tsx`

**1. Ny funktion `loadFromFileData`** — konverterar base64 till ArrayBuffer och kör `loader.parse()` direkt. Ingen XHR, ingen fetch.

**2. Ändra `useValidPropUrl`** — för blob URLs, returnera originalUrl direkt utan HEAD-check (den misslyckas alltid i sandboxen).

**3. Ändra `doLoad`** — om blob/data URL-laddning misslyckas (XHR error), försök ladda från catalogens `fileData` via `loader.parse()` istället för att ge upp eller loopa.

```typescript
// New helper — parse base64 directly, no network
function loadFromBase64(base64: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      loader.parse(bytes.buffer, '', (gltf) => resolve(gltf.scene), (err) => reject(err));
    } catch (e) { reject(e); }
  });
}
```

```typescript
// In doLoad catch block — try fileData fallback
.catch((err) => {
  // If blob URL failed, try loading from catalog fileData directly
  const state = useAppStore.getState();
  const propItem = state.props.items.find(p => p.id === id);
  const catItem = propItem ? state.props.catalog.find(c => c.id === propItem.catalogId) : null;
  const fileData = (catItem as any)?.fileData;
  
  if (fileData) {
    console.info(`[Props3D] Blob failed, loading from fileData for "${modelName}"`);
    loadFromBase64(fileData)
      .then((loadedScene) => { /* same success logic */ })
      .catch(() => setStatus('error'));
  } else {
    setStatus('error');
  }
});
```

**4. Förenkla `useValidPropUrl`** — ta bort fetch(HEAD) helt. Blob URLs passeras genom direkt. Om de misslyckas hanteras det i `doLoad`.

```typescript
function useValidPropUrl(propId: string, originalUrl: string): string {
  // No validation needed — if blob fails, doLoad handles fallback
  return originalUrl;
}
```

Egentligen kan vi ta bort hela hooken och bara använda `rawUrl` direkt.

### `src/components/build/furnish/FurnishTools.tsx`

**5. `handlePlaceFromCatalog`** — om catItem har fileData, skapa en FÄRSK blob URL (det aktuella scopet kanske stödjer det) eller bara skicka en markör-URL som signalerar att fileData ska användas.

## Filer

| Fil | Ändring |
|-----|--------|
| `src/components/build/Props3D.tsx` | Ta bort `useValidPropUrl`, lägg till `loadFromBase64`, fileData-fallback i `doLoad` |

