

# Fixar & Nya Funktioner: Vacuum, Smarta Högtalare, Backup

## Problem att lösa

1. **Gröna LED-ringen på vacuum** -- den tjocka torusGeometry-ringen ligger fel. Ska ligga platt (horisontellt) strax ovanför disken, inte vertikalt.
2. **Zoner visar ID istället för rumsnamn** i VacuumMappingTools -- roomId sparas som rumsnamn redan men visningen verkar inte uppdateras.
3. **Compact vacuum-widget saknar kontrollknappar** -- den kompakta vyn i hemskärmen visar bara status, inga städa/pausa/stopp/hem-knappar.
4. **Roborock-karta** -- Roborock/Valetudo har en uppmappad karta med rum. Vi kan förbereda import av denna via Valetudo API:t (framtida) men just nu flagga att `currentRoom` redan stöds och att kartan kan importeras som bild.
5. **Ny enhet: Smart Speaker (Google Home)** -- med 3D-modell och visuella effekter (musiknoter) när den spelar.
6. **Ny enhet: Soundbar/Högtalare** -- med 3D-modell och flygande musiknoter-effekt.
7. **Profilsparning & Backup** -- export/import av hela konfigurationen som JSON-fil.

---

## Filändringar

### 1. Fix: Vacuum LED-ring rotation
**`src/components/devices/DeviceMarkers3D.tsx`** rad 604
- Lägg till `rotation={[-Math.PI / 2, 0, 0]}` på LED-ringens mesh så torusen ligger platt.
- Justera y-position till `0.052` (strax ovanför disc-toppen).

### 2. Fix: Zone-visning i VacuumMappingTools
**`src/components/build/devices/VacuumMappingTools.tsx`**
- Logiken finns redan och ser korrekt ut (rad 30 `getZoneRoomName`). Kontrollera att `zone.roomId` faktiskt matchar rum. Problemet kan vara att roomId sparas som `Zon <timestamp>` om centroid inte hittas i ett rum. Lägg till tydligare fallback och möjlighet att klicka för att redigera zonnamn.

### 3. Fix: Compact vacuum-widget med kontroller
**`src/components/home/cards/DeviceControlCard.tsx`**
- I `CompactDeviceView`, lägg till special-case för `vacuum` (som redan finns för `media_screen`) med inline-knappar: Städa, Pausa, Stopp, Hem + rumsindikator.

### 4. Nya enhetstyper: `speaker` och `soundbar`
**`src/store/types.ts`**
- Lägg till `'speaker' | 'soundbar'` i `DeviceKind`.
- Lägg till `SpeakerState` interface: `{ on: boolean; state: 'playing' | 'paused' | 'idle'; volume: number; source?: string; mediaTitle?: string; isSpeaking?: boolean }`.
- Lägg till i `DeviceState`-union och `BuildTool`.

**`src/lib/haDomainMapping.ts`**
- Mappa `media_player` med attribut `device_class: 'speaker'` → `speaker`, och `device_class: 'tv'` → `media_screen`.

**`src/lib/haMapping.ts`**
- Ny case för `speaker`/`soundbar` som mappar media_player-attribut.

### 5. 3D-modeller med effekter
**`src/components/devices/DeviceMarkers3D.tsx`**
- **SpeakerMarker3D** (Google Home-stil): Cylinder med rundad topp, ljusring vid basen som pulserar vid uppspelning. När `state === 'playing'` spawnas små not-partiklar (♪) som flyter uppåt med fade-out.
- **SoundbarMarker3D**: Avlång box, LED-strip framtill. Samma not-partikel-effekt vid uppspelning men bredare spridning.
- Partikel-systemet: 5-8 `Text`-sprites med musiknot-tecken som rör sig uppåt med sinusrörelse och fadar ut. Använd `useFrame` för animation.

### 6. UI-kontroller
**`src/components/home/cards/DeviceControlCard.tsx`**
- `SpeakerControl`: Play/Pause/Stop, volym-slider, källa, "Pratar"-indikator.
- `CompactSpeakerView`: Kompakt med play/pause + volymindikator.

**`src/components/build/devices/DevicePlacementTools.tsx`**
- Nya ikoner: `Speaker` för smart speaker, `Music` för soundbar.

### 7. Profil & Backup-system
**`src/components/home/cards/ProfilePanel.tsx`**
- Ny sektion "Data & Backup":
  - **Exportera backup** -- serialisera hela Zustand-state till JSON, trigga filnedladdning.
  - **Importera backup** -- fil-input som läser JSON och laddar in state via `useAppStore.setState()`.
  - **Rensa all data** -- nollställ localStorage med bekräftelsedialog.

---

## Sammanfattning av filer

| Fil | Ändring |
|-----|---------|
| `src/store/types.ts` | `speaker`, `soundbar` DeviceKind + `SpeakerState` + BuildTool-varianter |
| `src/components/devices/DeviceMarkers3D.tsx` | Fix LED-ring rotation. Nya `SpeakerMarker3D` + `SoundbarMarker3D` med not-partiklar |
| `src/components/home/cards/DeviceControlCard.tsx` | Fix compact vacuum med kontroller. Ny `SpeakerControl` + compact speaker |
| `src/components/build/devices/DevicePlacementTools.tsx` | Nya placement-verktyg för speaker/soundbar |
| `src/components/build/devices/VacuumMappingTools.tsx` | Förbättrad zon-namnvisning |
| `src/lib/haDomainMapping.ts` | Mappa speaker/soundbar |
| `src/lib/haMapping.ts` | Ny state-mappning för speaker/soundbar |
| `src/components/home/cards/ProfilePanel.tsx` | Export/import backup-funktionalitet |

