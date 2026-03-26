

# Fix: Rumsbyte för robot + multi-rum städning + emoji-städning

## Problem

1. **Rumsbyte fungerar inte** — `handleRoomCleaning` skickar `app_segment_clean` direkt utan att stoppa pågående städning först. Roborock ignorerar nya segment-kommandon om den redan städar.

2. **Ingen multi-rum-städning** — Idag kan man bara starta ett rum åt gången. Roborock stöder `app_segment_clean` med en array av segment-ID:n + repeat-count (`[segId1, segId2, ...]` + `repeat: N`).

3. **Emojis finns kvar i ~19 filer** — bl.a. RobotPanel (`🤖`), VacuumMappingTools (`🤖`, `✅`, `💡`), DevicePlacementTools (alla kindLabels), BuildInspector (ljustyper), BuildCanvas2D, StandbyWeather, DeviceControlCard, GraphicsSettings, DisplaySettings, roomTemplates, roomDetection, PerformanceHUD.

---

## 1. Rumsbyte: stoppa först, sedan byt

**Fil:** `src/components/home/cards/RobotPanel.tsx`

Ändra `handleRoomCleaning` (rad 588-602):
- Om `data.status === 'cleaning'`: skicka `vacuum.stop` först, vänta 500ms, sedan skicka `app_segment_clean` med nytt segment
- Optimistisk state: `status: 'returning'` → kort paus → `status: 'cleaning'` med nytt `targetRoom`

```
const handleRoomCleaning = async (roomName, segmentId, fanPreset) => {
  if (data.status === 'cleaning') {
    await sendRobotService('stop', {}, { status: 'idle', targetRoom: undefined });
    await new Promise(r => setTimeout(r, 800));
  }
  // sedan skicka app_segment_clean som vanligt
};
```

## 2. Multi-rum-städning med repeat

**Fil:** `src/store/types.ts`
- Inget nytt type behövs — `app_segment_clean` params stöder redan arrays

**Fil:** `src/components/home/cards/RobotPanel.tsx`

Utöka `RoomZoneCards`:
- Lägg till checkbox-läge: "Välj flera rum" toggle
- När aktiv: varje rum-kort får en checkbox + repeat-counter (1-3x)
- Ny knapp "Städa valda rum" som samlar alla valda segment-ID:n
- Skicka: `app_segment_clean` med `params: { segments: [id1, id2, ...], repeat: N }`
- Alternativt Roborock-format: `params: [{"segments": [id1,id2], "repeat": 2}]`

UI-flow:
```
[Toggle: Välj flera rum]
  ☑ Kök (2x)      ☑ Vardagsrum (1x)      ☐ Sovrum
  [Städa 2 rum →]
```

## 3. Emoji-städning — alla kvarvarande filer

Byter alla emojis till Lucide-ikoner eller ren text i dessa filer:

| Fil | Emojis | Åtgärd |
|-----|--------|--------|
| `RobotPanel.tsx` | `🤖` (rad 617) | → `Bot` ikon |
| `DeviceControlCard.tsx` | `🤖` (rad 574, 1033) | → `Bot` ikon |
| `VacuumMappingTools.tsx` | `🤖`, `✅`, `💡` (rad 180, 282, 297) | → Lucide `Bot`, `CheckCircle`, `Info` |
| `BuildCanvas2D.tsx` | `🤖` (rad 401) | → ren text utan emoji |
| `DevicePlacementTools.tsx` | alla kindLabels (rad 58-68) | → ren text (ta bort emojis, behåll bara namn) |
| `BuildInspector.tsx` | `🔵🔹🟢🟡⚪💡🔦🍳` (rad 1197-1300, 1616) | → Lucide-ikoner eller färgade dots |
| `StandbyWeather.tsx` | `☀️☁️🌧️` (rad 3-6) | → Lucide `Sun`, `Cloud`, `CloudRain` |
| `GraphicsSettings.tsx` | `✅` (rad 21, 379) | → ta bort från toast-text |
| `DisplaySettings.tsx` | `💡` (rad 143) | → Lucide `Info` eller ren text |
| `roomTemplates.ts` | `🛏️🍳🛋️🚿` (rad 27-31) | → ren text eller Lucide |
| `roomDetection.ts` | `⚠️` (rad 444) | → ren text i console.warn |
| `PerformanceHUD.tsx` | `⚡` (rad 80) | → ren text |

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/cards/RobotPanel.tsx` | Stop-before-switch logik, multi-rum UI med repeat, emoji → Lucide |
| `src/components/home/cards/DeviceControlCard.tsx` | `🤖` → `Bot` |
| `src/components/build/devices/VacuumMappingTools.tsx` | Emojis → Lucide |
| `src/components/build/devices/DevicePlacementTools.tsx` | Emojis → ren text |
| `src/components/build/BuildInspector.tsx` | Emojis → Lucide/dots |
| `src/components/build/BuildCanvas2D.tsx` | `🤖` → ren text |
| `src/components/standby/StandbyWeather.tsx` | Emojis → Lucide |
| `src/components/home/cards/GraphicsSettings.tsx` | `✅` bort |
| `src/components/home/cards/DisplaySettings.tsx` | `💡` → Lucide |
| `src/lib/roomTemplates.ts` | Emojis → ren text |
| `src/lib/roomDetection.ts` | `⚠️` → ren text |
| `src/components/home/PerformanceHUD.tsx` | `⚡` → ren text |

