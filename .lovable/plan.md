
# Fix: Kontrollpanelen saknar HA-anslutning

## Problemet

Appen har tre vyer som renderas **exklusivt** i `Index.tsx`:

```text
appMode === 'home'      -> HomeView       (har useHomeAssistant + useHABridge)
appMode === 'dashboard' -> DashboardView  (SAKNAR bada hooks!)
appMode === 'build'     -> BuildModeV2    (har useHomeAssistant + useHABridge)
```

Nar du gar till Kontrollpanelen avmonteras `HomeView` och med den forsvinner bade WebSocket-anslutningen och bridgen. Darfor fungerar av/pa fran widgetarna pa hemskermen men inte fran kontrollpanelen.

## Losning

Flytta `useHomeAssistant()` och `useHABridge()` fran de enskilda vyerna till `Index.tsx` sa att de alltid ar aktiva oavsett vilken vy som visas. Ta bort de duplicerade anropen fran `HomeView` och `BuildModeV2`.

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/pages/Index.tsx` | Lagg till `useHomeAssistant()` och `useHABridge()` har sa de lever under hela appens livstid |
| `src/components/home/HomeView.tsx` | Ta bort `useHomeAssistant()` och `useHABridge()` (flyttade till Index) |
| `src/components/build/BuildModeV2.tsx` | Ta bort `useHomeAssistant()` och `useHABridge()` (flyttade till Index) |

Inga andra filer behover andras. Kontrollpanelen (`DashboardView`, `DevicesSection`, `DeviceControlCard`) anvander redan `updateDeviceState` fran storen -- det enda som saknades var att bridgen lyssnade.
