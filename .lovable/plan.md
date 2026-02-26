

# Plan: Fixar och nya funktioner

## Problem identifierade

### 1. Musiknot-partiklar fungerar inte
`MusicNoteParticles` och `SpeakerMarker3D`/`SoundbarMarker3D` skapar partikeldata i `useRef` men renderar aldrig synliga 3D-objekt. `notesGroupRef` barn tas bort varje frame men inga nya läggs till visuellt — partiklarna finns bara som data.

**Fix**: Rendera partiklarna som faktiska `<sprite>`-element med `<spriteMaterial>` i JSX via state-driven rendering istället för imperativ children-manipulation.

### 2. Rotation fungerar bara för media_screen
I `DeviceMarkers3D`, rad 907-918, renderas alla icke-media_screen-markörer via `markerComponents[marker.kind]` men `marker.rotation` skickas aldrig vidare. Bara `MediaScreenMarker` (rad 407) applicerar rotation.

**Fix**: Wrappa alla markörer i en `<group rotation={marker.rotation}>` i renderloopen (rad 907-918).

### 3. Zon-namngivning — sparar UUID istället för rumsnamn
`BuildCanvas2D.tsx` rad 1187: `roomId = room?.id ?? ...` sparar rummets UUID. `VacuumMappingTools` matchar mot `r.id === roomId` men visar `r.name`. Problemet: om inget rum hittas faller det tillbaka till `Zon <timestamp>`.

**Fix**: Spara `room?.name` som roomId istället, eller ändra visningslogiken att alltid slå upp rum via ID korrekt. Bäst: spara room.id men visa alltid room.name via lookup.

### 4. Speaker reagerar inte på "Hej Google" (isSpeaking)
`isSpeaking`-flaggan sätts aldrig från HA. `haMapping.ts` mappar inte `media_player`-attribut som indikerar att assistenten lyssnar/pratar.

**Fix**: I `haMapping.ts` speaker-case, kolla `attributes.is_volume_muted`, eller specifikt HA-states som `buffering` → tolka som `isSpeaking`.

### 5. Dashboard-tabs: dubbletter och namnändring
- "Profil" → "Inställningar", flytta sist
- Kontrollera att Plats/Väder inte dupliceras
- Ta bort "Widgets" om det överlappar med Hem

### 6. Väckarklocka-funktion
Ny tab eller sektion under Inställningar med alarm-funktion. Skjuts till framtida iteration — noteras bara i planen.

---

## Filändringar

| Fil | Ändring |
|-----|---------|
| `src/components/devices/DeviceMarkers3D.tsx` | 1) Fix musik-partiklar: rendera sprites via React state. 2) Applicera `marker.rotation` på alla markörer i renderloopen. |
| `src/components/build/BuildCanvas2D.tsx` | Fix rad 1187: spara `room?.name` som display men behåll `room?.id` som roomId. Förbättra fallback-namn. |
| `src/components/build/devices/VacuumMappingTools.tsx` | Förbättra room-name lookup att matcha på room.id korrekt. |
| `src/lib/haMapping.ts` | I speaker-case: mappa `isSpeaking` baserat på HA media_player state. |
| `src/components/home/DashboardGrid.tsx` | Döp om "Profil" → "Inställningar" med Settings-ikon. Flytta sist. Ta bort eventuella dubbletter. |

### Detaljerad implementation

**Musiknoter (DeviceMarkers3D.tsx)**:
Ersätt imperativ children-manipulation med React-state:
```text
const [notes, setNotes] = useState<NoteParticle[]>([]);
useFrame → uppdatera notes via setNotes
Rendera: notes.map(n => <sprite position={[n.x, n.y, n.z]}><spriteMaterial ... /></sprite>)
```

**Rotation för alla markörer (DeviceMarkers3D.tsx)**:
I renderloopen (rad ~907-918), wrappa `<Component>` i `<group rotation={marker.rotation}>`.

**Zon-namn (BuildCanvas2D.tsx)**:
Rad 1187: Ändra till `roomId: room?.name ?? 'Zon ' + (mapping?.zones?.length ?? 0 + 1)` så att roomId = rumsnamn (som matchar HA-zonnamn).

**Dashboard-tabs (DashboardGrid.tsx)**:
Ändra categories-array: byt `profile` label till "Inställningar", ikon till `Settings`, flytta sist i listan.

