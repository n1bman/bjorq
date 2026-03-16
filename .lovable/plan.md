

# Fix: Rum-ytlager dubbleras av gammal fallback-logik

## Rotorsak
Båda renderers (`Walls3D.tsx` och `InteractiveWalls3D.tsx`) bygger fortfarande en `wallRoomMaterial`-lookup som mappar `room.wallMaterialId` → `fallbackMaterialId` i `generateWallSegments`. Detta gör att den **strukturella väggen själv** tar rummets färg — exakt samma beteende som innan. `RoomWallSurfaces3D` renderar sedan *ovanpå* den redan färgade väggen, vilket ger dubbel färg och gör det omöjligt att se det tunna ytlagret som separat.

## Åtgärder

### 1. Ta bort `wallRoomMaterial`-lookup från `InteractiveWalls3D.tsx`
**Rad 46-56**: Ta bort hela `wallRoomMaterial`-memot som mappar `room.wallMaterialId` till väggar. Ändra `fallbackMaterialId` i `generateWallSegments`-anropet (rad 163) till `undefined` — den strukturella väggen ska inte använda rummets material. Väggens egna `leftMaterialId`/`rightMaterialId` (direkt väggmålning) fortsätter fungera via `resolveWallColors`.

### 2. Ta bort `matMap` från `Walls3D.tsx`
**Rad 20-36**: Ta bort `wallMaterialId`-mappningen i `wallRoomData.matMap`. Ändra `fallbackMaterialId` (rad 44) till `undefined`. Behåll `texMap` för texturparametrar (dessa används av direkt väggmålning).

### 3. Resultat
- **Strukturella väggar**: Förblir vita (`#f5f0e8`) om inte direkt väggmålade via `leftMaterialId`/`rightMaterialId`
- **Rummålning**: Renderas enbart av `RoomWallSurfaces3D` som tunt ytlager
- **Direkt väggmålning**: Fungerar som förut via `updateWall` → `leftMaterialId`/`rightMaterialId` → `resolveWallColors`
- **Ingen dubbel färg**: Strukturella väggen visar inte rummets material

### Filer som ändras
| Fil | Ändring |
|-----|---------|
| `src/components/build/InteractiveWalls3D.tsx` | Ta bort `wallRoomMaterial`-memo, sätt `fallbackMaterialId: undefined` |
| `src/components/build/Walls3D.tsx` | Ta bort `matMap`-delen, sätt `fallbackMaterialId: undefined` |

