

# TV-skarm: Frontljus, tid, centrerad text och mediakontroller i widget

## 1. Frontljus istallet for bakomliggande puls

Det pulserande ljuset ska inte lysa bakom skarmen utan istallet simulera ett svagt sken fran skarmytan framat. Andring:

- Flytta `pointLight` fran `position={[0, 0, 0.4]}` till `position={[0, 0, 0.8]}` och rikta det framat
- Byt till en `spotLight` med `ref` som riktas framat (mot kameran), med begransad vinkel sa ljuset "sprider sig" fran skarmytan
- Alternativt: lagg till ett transparent `meshBasicMaterial`-plan precis framfor skarmen som pulserar i opacity (0.02-0.06) for att simulera ett mjukt sken over skarmytan -- enklare och snyggare
- Pulsfrekvensen behalles (`sin(Date.now() * 0.002)`)

## 2. Visa tid pa skarmen (forlopp)

I `drawScreenCanvas`, nar media spelas och `media_position`/`media_duration` finns:

- Formatera `position` och `duration` som `MM:SS` eller `H:MM:SS`
- Rita tidstexten bredvid progressbaren: `"12:34 / 45:00"`
- Placera den centrerat under progressbaren

## 3. Centrera "Spelar..."-texten och all medieinfo

Just nu ar titeln vansterjusterad (`textAlign = 'left'`, x=30). Andra till:

- `textAlign = 'center'` for titel, artist och status
- x-koordinat andras till `w / 2`
- Badge (app-logotyp) centreras ocksa hogre upp
- Play/pause-ikonen ar redan centrerad -- behalls

## 4. Mediakontroller i hemskarmens widget

Nar en `media_screen`-widget visas pa hemskarten och enheten spelar, ska widgeten expanderas med kontrollknappar istallet for att bara vara en toggle:

### I `HomeView.tsx`:
- For `media_screen`-enheter som ar "on": visa en utokad widget med kontrollknappar istallet for enkel toggle
- Klick pa widgeten ska INTE toggle:a av/pa utan istallet visa kontroller

### I `DeviceControlCard.tsx` (compact media):
- Lagg till en ny `CompactMediaControl`-komponent som visas i compact-laget for media_screen
- Knappar: **Bakåt** (SkipBack), **Play/Pause**, **Framåt** (SkipForward), **Stopp** (Square)
- Dessa anropar `updateDeviceState` med ratt state-andringar

### I `useHABridge.ts`:
- Lagg till stod for `media_next_track` och `media_previous_track` kommandon
- Ny logik: om `data._action === 'next'` -> `media_player.media_next_track`, liknande for `'previous'`
- Alternativt: exponera `callService` direkt via store/hook sa widgeten kan anropa HA-tjanster utan att ga via deviceState

### Nytt i `MediaState` (types.ts):
- Lagg till optional `_action?: 'next' | 'previous'` som bridge:n reagerar pa och sedan rensar

## Filandringar

| Fil | Andring |
|-----|---------|
| `src/components/devices/DeviceMarkers3D.tsx` | 1) Flytta/andra pulserande ljus till framsida-sken. 2) Centrera all text pa canvas. 3) Lagg till tidsvisning vid progress. |
| `src/components/home/HomeView.tsx` | Media_screen-widgets far expanderad vy med kontroller istallet for enkel toggle. |
| `src/components/home/cards/DeviceControlCard.tsx` | Ny `CompactMediaControl` med skip/play/pause/stop-knappar i compact-laget. |
| `src/store/types.ts` | Lagg till `_action?: 'next' \| 'previous'` i `MediaState`. |
| `src/hooks/useHABridge.ts` | Hantera `_action` for media_player: `media_next_track`, `media_previous_track`. |

