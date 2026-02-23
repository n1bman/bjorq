

# Fix: DeviceMarkers3D kraschar vid okänd enhetstyp

## Problem

Rad 384 i `DeviceMarkers3D.tsx` gör `const Component = markerComponents[marker.kind]` utan att kontrollera om resultatet är `undefined`. Om en enhet i localStorage har en `kind` som inte matchar något i `markerComponents`-mappen (t.ex. från korrupt eller gammal data), blir `Component` undefined och React kastar error #130.

## Lösning

Två ändringar i `DeviceMarkers3D.tsx`:

1. **Lägg till en guard efter rad 384** -- om `Component` är undefined, hoppa över markören (return null) eller använd `GenericMarker` som fallback.

2. **Bumpa store-version till 10** i `useAppStore.ts` för att rensa eventuell korrupt data som redan finns i localStorage.

### Teknisk ändring

I `DeviceMarkers3D.tsx`, efter rad 384:
```tsx
const Component = markerComponents[marker.kind];
if (!Component) return null; // Skip unknown device kinds
```

I `useAppStore.ts`: version 9 -> 10 med force-clear migration.

