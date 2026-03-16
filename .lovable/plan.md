

# Plan: Per-rum inre ytlager (RoomWallSurfaces3D)

## Sammanfattning
Ersätt nuvarande rum-väggmålning (som skriver `leftMaterialId`/`rightMaterialId` direkt på hela väggobjekt) med ett separat inre ytlager — tunna plan som renderas inuti varje rum, begränsade av rummets polygon och klippta vid öppningar.

## Steg

### 1. Backup av befintlig logik
Skapa `src/backup/setRoomMaterial-wall-backup.ts` med en kopia av den nuvarande `setRoomMaterial` wall-grenen (rad 724-782 i useAppStore.ts). Dokumentera vilka filer som berörs.

### 2. Uppdatera `setRoomMaterial` (wall-grenen)
**Fil: `src/store/useAppStore.ts` rad 709-782**

Ersätt wall-grenen: istället för att iterera `room.wallIds` och sätta `leftMaterialId`/`rightMaterialId` på varje vägg, sätt `room.wallMaterialId` på rum-objektet. En enkel property-uppdatering, samma mönster som `floorMaterialId`.

```typescript
// target === 'wall'
return {
  layout: { ...s.layout, floors: s.layout.floors.map(f =>
    f.id === floorId
      ? { ...f, rooms: f.rooms.map(r => r.id === roomId ? { ...r, wallMaterialId: materialId } : r) }
      : f
  )}
};
```

### 3. Ny komponent: `RoomWallSurfaces3D`
**Ny fil: `src/components/build/RoomWallSurfaces3D.tsx`**

Renderar per-rum inre ytlager. Logik:

1. **Per rum**: iterera `room.wallIds`, hitta matchande vägg
2. **Bestäm insida**: använd `getRoomFacingSide(wall, room.polygon)` — returnerar `'left'` eller `'right'`
3. **Generera plan per vägg-segment**:
   - Beräkna vägg-längd, position, rotation
   - Offset `0.002m` inåt från väggytan (förhindrar z-fighting)
   - **Klipp vid rummets polygon-gränser**: om väggen sträcker sig förbi T-junction, begränsa planet till den del som ligger inom rummets polygon. Projicera rummets polygon-kanter på vägg-axeln för att hitta start/slut.
   - **Klipp vid öppningar**: använd `wall.openings` för att generera strips (samma logik som `generateWallSegments` — vertikala strips, headers, sills)
4. **Material**: hämta från `room.wallMaterialId` via `getMaterialById`, skapa `MeshStandardMaterial` med `polygonOffset: true, polygonOffsetFactor: -2`

Geometrin är enbart `PlaneGeometry` (inget miter-behov — planen sitter på insidan av den riktiga väggen).

### 4. Klippning vid T-korsningar
Nyckeln som löser läckageproblemet: för varje vägg i rummet, beräkna den del av väggen som faktiskt gränsar till rummet genom att projicera rummets polygon-kanter på vägg-axeln. Detta ger ett `[startOffset, endOffset]`-par längs väggen. Ytlagret renderas bara inom detta intervall.

### 5. Klippning vid öppningar
Inom det T-klippta intervallet, subtrahera öppningarnas rektanglar:
- Vertikala strips mellan/utanför öppningar (full höjd)
- Headers ovanför öppningar
- Sills under fönster
- Inga strips för passager/dörrar vid golvnivå

### 6. Integration i renderers
- **`Walls3D.tsx`**: Lägg till `<RoomWallSurfaces3D />` som syskon efter wall-meshar
- **`InteractiveWalls3D.tsx`**: Samma, men med click-handler som selekterar rum (inte vägg)

### 7. Interaktionslogik
- Klick på rum-ytlagret → `setSelection({ type: 'room', id: roomId })`
- Klick på riktig vägg (bakom ytlagret) → `setSelection({ type: 'wall', id: wallId, faceSide })`
- Rum-ytlagret sätts med `pointerEvents` bara i paint-mode, annars genomskinligt för interaktion

### 8. Rensa gammal logik
Ta bort den gamla wall-grenen i `setRoomMaterial` som sätter `leftMaterialId`/`rightMaterialId` på väggar. Direkt väggmålning (klick på enskild vägg → set leftMaterialId/rightMaterialId) förblir oförändrad.

## Filer som ändras
| Fil | Ändring |
|-----|---------|
| `src/backup/setRoomMaterial-wall-backup.ts` | **Ny** — backup av gammal logik |
| `src/store/useAppStore.ts` | Förenkla `setRoomMaterial` wall-gren |
| `src/components/build/RoomWallSurfaces3D.tsx` | **Ny** — per-rum inre ytlager |
| `src/components/build/Walls3D.tsx` | Inkludera `RoomWallSurfaces3D` |
| `src/components/build/InteractiveWalls3D.tsx` | Inkludera `RoomWallSurfaces3D` |

## Separation: rum-målning vs vägg-målning
- **Rummålning**: `setRoomMaterial(floorId, roomId, 'wall', matId)` → sätter `room.wallMaterialId` → renderas av `RoomWallSurfaces3D`
- **Väggmålning**: `updateWall(wallId, { leftMaterialId/rightMaterialId })` → renderas av befintligt vägg-system → oförändrat

## Rollback
Om lösningen inte fungerar: ta bort `RoomWallSurfaces3D.tsx`, återställ `setRoomMaterial` wall-grenen från backup-filen, ta bort `RoomWallSurfaces3D`-importer från Walls3D/InteractiveWalls3D.

