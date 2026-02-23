

# Screen Overlay (media_screen) -- Implementationsplan

## Oversikt

Ny enhetstyp "Skarm (Overlay)" som placeras i 3D-varlden och visar "Now Playing"-information fran Home Assistant media_player-entiteter. Implementeras som en plan mesh med CanvasTexture.

---

## 1. Typer och Store (types.ts, useAppStore.ts)

### types.ts

- Utoka `DeviceKind` med `'media_screen'`
- Utoka `DeviceSurface` med `'free'`
- Utoka `BuildTool` med `'place-media-screen'`
- Utoka `DeviceMarker` med valfria falt:
  - `scale?: [number, number, number]`
  - `screenConfig?: { aspectRatio: number; uiStyle: 'minimal' | 'poster'; showProgress: boolean }`
- Ingen ny slice -- media_screen ar bara en DeviceMarker med extra falt

### useAppStore.ts

- Bump version till 8 (tvingar re-init)
- Inga nya actions behovs -- `addDevice`, `updateDevice`, `removeDevice` fungerar redan

---

## 2. Bygge -- Placering (DevicePlacementTools.tsx)

- Lagg till en ny rad i `deviceTools`-arrayen:
  ```
  { key: 'place-media-screen', kind: 'media_screen', label: 'Skarm', icon: Monitor, color: 'text-indigo-400' }
  ```
- Lagg till `'media_screen'` i `kindLabels`

---

## 3. Bygge -- Placeringslogik (BuildScene3D.tsx)

- I `handleGroundPointerDown`, nar `kind === 'media_screen'`:
  - Satt `surface: 'free'`
  - Satt `scale: [1.2, 0.675, 1]` (16:9 default, ~120cm bred)
  - Satt `screenConfig: { aspectRatio: 16/9, uiStyle: 'minimal', showProgress: true }`
  - Satt `position.y` till vagghojd (ca 1.5m, ogonhojd for TV)

---

## 4. 3D-rendering -- MediaScreenMarker (DeviceMarkers3D.tsx)

Ny komponent `MediaScreenMarker`:
- Renderar en `<mesh>` med `<planeGeometry>` (16:9 ratio)
- Storlek styrs av `marker.scale` (default 1.2 x 0.675m)
- Ram runt skarmen (tunn box eller lines)
- Textur fran en off-screen `<canvas>` via `CanvasTexture`
- Canvas ritar:
  - Mork bakgrund (#1a1a2e)
  - App-namn/kalla (Netflix/YouTube/Spotify/Media)
  - Media-titel
  - Play/pause-ikon
  - Progress bar (om `showProgress`)
  - Poster-bild (om `uiStyle === 'poster'` och thumbnail finns)
- Uppdateras nar HA-state andras (via `liveStates[entityId]`)
- Cacheas -- bara omritas nar data andras

### Interaktion
- Klick i bygglaage: markera for redigering
- Klick i hemlaage: oppna bottom sheet med now-playing-info
- Drag i bygglaage: samma pointer-drag-system som andra enheter

---

## 5. Bygge -- Inspector (BuildInspector.tsx)

Nar `device.kind === 'media_screen'`, visa utokad inspector:

- **Namn** (input)
- **Bredd** slider (0.3-3m, styr scale[0], scale[1] foljer via aspectRatio)
- **Rotation X/Y/Z** sliders (for att luta/vinkla skarmen mot en vagg)
- **Aspect Ratio** dropdown (16:9, 21:9, 4:3)
- **UI-stil** toggle (Minimal / Poster)
- **Visa progress** toggle
- **HA Entity ID** input (media_player.*)
- **Fit 16:9** knapp -- aterstaller scale till korrekt ratio
- **Nollstall rotation** knapp
- Position X/Y/Z sliders (redan finns)

---

## 6. Kontrollpanel -- Enhetsbindning (DevicesSection.tsx)

Nar en `media_screen`-enhet visas i dashboarden:
- Visa speciellt kort med skarm-ikon
- Visa bundet entity_id (media_player.*)
- Visa live-state: titel, kalla, play/pause
- "Bind"-knapp som oppnar entity-valjare (filtrerad pa domain `media_player`)

---

## 7. Hem -- 3D-vy (Scene3D.tsx / DeviceMarkers3D.tsx)

- MediaScreenMarker renderas aven i hemvyn (inte bara bygglaage)
- Textur uppdateras live fran `homeAssistant.liveStates`
- Tap pa skarmen oppnar en bottom sheet med:
  - Bundet entity
  - Now playing info
  - Play/pause-knapp (skickar service call via HA)

---

## 8. 2D-planvy (BuildCanvas2D.tsx)

- Rita media_screen-enheter som en rektangel (inte cirkel som andra enheter)
- Visa "TV"-ikon eller text
- Storlek baserad pa `scale`

---

## Tekniska detaljer

### CanvasTexture-rendering

```text
function drawScreenContent(canvas, ctx, mediaState, config):
  1. Rensa canvas (mork bakgrund)
  2. Rita app-namn (stora bokstaver, liten font)
  3. Rita titel (storre font, vit)
  4. Rita play/pause-ikon (triangel eller dubbla streck)
  5. Om showProgress: rita progress bar
  6. Om poster-stil och thumbnail: rita bild som bakgrund
  7. Returnera canvas for CanvasTexture
```

### Fil-andringar (sammanfattning)

| Fil | Andring |
|-----|---------|
| `types.ts` | Utoka DeviceKind, BuildTool, DeviceMarker, DeviceSurface |
| `useAppStore.ts` | Version bump till 8 |
| `DevicePlacementTools.tsx` | Ny knapp "Skarm" |
| `BuildScene3D.tsx` | Hantera `place-media-screen` placering |
| `DeviceMarkers3D.tsx` | Ny `MediaScreenMarker` med CanvasTexture |
| `BuildInspector.tsx` | Utokad inspector for media_screen |
| `DevicesSection.tsx` | Speciellt kort for media_screen |
| `BuildCanvas2D.tsx` | Rektangulart fotavtryck for media_screen |

### Implementationsordning

1. Typer och store (types.ts, useAppStore.ts)
2. Placeringsverktyg (DevicePlacementTools.tsx, BuildScene3D.tsx)
3. 3D-rendering med CanvasTexture (DeviceMarkers3D.tsx)
4. Inspector med skalnings/rotationskontroller (BuildInspector.tsx)
5. Dashboard-kort (DevicesSection.tsx)
6. 2D-planvy (BuildCanvas2D.tsx)

