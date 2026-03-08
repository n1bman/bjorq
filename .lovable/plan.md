

# Fix: KIVIK-modellen hänger sig på "Laddar..." + FPS-tapp

## Rotorsak — re-load-loop

`useValidPropUrl` (rad 126) har `catalog`, `items` och `updateProp` som `useEffect`-dependencies. Dessa arrayer får **nya referensobjekt vid varje Zustand-uppdatering**, vilket innebär:

```text
1. Modell laddas OK → updateProp(id, { modelStats }) anropas
2. Store uppdateras → items/catalog får ny referens
3. useValidPropUrl-effekten körs om
4. fetch(HEAD) på blob URL i sandboxen → misslyckas ofta
5. Skapar NY blob URL → updateProp({ url: newUrl })
6. Ny url → useEffect[url] → dispose + doLoad igen
7. → Loop. Modellen når aldrig "ready"-status.
```

Dessutom har `doLoad` och `handleLoadError` cirkulära `useCallback`-beroenden som skapar ständiga funktionsåterskapningar.

Resultatet: modellen fastnar på "Laddar...", `modelStats` sparas aldrig korrekt (→ "Laddar prestandainfo…" i inspektorn), och de hundratals re-renderingarna drar ner FPS till ~28.

## Lösning

### `src/components/build/Props3D.tsx`

**1. Stabilisera `useValidPropUrl`** — ta bort `catalog`, `items`, `updateProp` från dependencies. Läs dem via `useAppStore.getState()` inuti catch-blocket. Dependencies blir `[originalUrl, propId]`.

**2. Loading-guard** — lägg till `loadingRef` som förhindrar att `doLoad` anropas medan en laddning redan pågår.

**3. Eliminera cirkulära useCallback-beroenden** — konvertera `doLoad` och `handleLoadError` till vanliga funktioner som använder refs istället för att vara `useCallback` med stale closures.

**4. Spåra senast laddade URL** — `lastLoadedUrl` ref förhindrar att samma URL laddas om i onödan.

```typescript
// BEFORE (line 126):
}, [originalUrl, propId, catalog, items, updateProp]);

// AFTER:
useEffect(() => {
  if (!originalUrl) { setValidUrl(''); return; }
  if (!originalUrl.startsWith('blob:')) { setValidUrl(originalUrl); return; }
  
  fetch(originalUrl, { method: 'HEAD' })
    .then(() => setValidUrl(originalUrl))
    .catch(() => {
      // Read from store snapshot — no dependency needed
      const { props: { items, catalog } } = useAppStore.getState();
      const propItem = items.find((p) => p.id === propId);
      const catItem = propItem ? catalog.find((c: any) => c.id === propItem.catalogId) : null;
      const fileData = (catItem as any)?.fileData;
      if (fileData) {
        const newUrl = base64ToBlobUrl(fileData);
        useAppStore.getState().updateProp(propId, { url: newUrl });
        setValidUrl(newUrl);
      } else {
        setValidUrl(originalUrl);
      }
    });
}, [originalUrl, propId]);  // ← stable deps only
```

```typescript
// Replace useCallback chain with refs + plain function
const loadingRef = useRef(false);
const lastLoadedUrl = useRef('');

const doLoad = (loadUrl: string) => {
  if (loadingRef.current) return;
  loadingRef.current = true;
  setStatus('loading');
  // ... load logic, set loadingRef.current = false in .then/.catch
};

useEffect(() => {
  if (!url || url === lastLoadedUrl.current) return;
  lastLoadedUrl.current = url;
  // ... dispose old scene, call doLoad
}, [url]);
```

## Filer

| Fil | Ändring |
|-----|--------|
| `src/components/build/Props3D.tsx` | Stabilisera deps, loading guard, bryt cirkulära callbacks |

