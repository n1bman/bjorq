

# Transparent hjälpsfär för alla ljusarmaturer i designläge

## Ändring

**Fil:** `src/components/devices/DeviceMarkers3D.tsx`

I `LightFixtureMarker` (rad ~1201):
1. Läs `appMode` från store
2. Före `{selected && <SelectionRing .../>}` (rad ~1320), lägg till en transparent sfär som visas för **alla** fixtureModel-typer i build-läge:

```tsx
const appMode = useAppStore((s) => s.appMode);

// Rad ~1319, före SelectionRing:
{appMode === 'build' && (
  <mesh>
    <sphereGeometry args={[0.06, 16, 16]} />
    <meshStandardMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} />
  </mesh>
)}
```

En enda ändring — sfären renderas för led-bulb, led-bar, led-spot och led-gu10 i build-läge.

