

# Synlig Skarm i 3D -- Fixplan

## Problem

Skarmen placeras korrekt men syns inte i 3D-varlden av tre anledningar:

1. **For mork**: Skarmen har mork bakgrund utan emissiv belysning -- den smälter in i scenen
2. **Ingen default-bild**: Utan HA-koppling visar den bara "Ingen media" i liten vit text pa natt-svart bakgrund
3. **Inget sken**: En TV som ar "pa" borde lysa upp omgivningen

## Andringar

### 1. MediaScreenMarker -- emissivt material och glow (DeviceMarkers3D.tsx)

- Byt fran `meshBasicMaterial` till `meshStandardMaterial` med `emissive` och `emissiveIntensity` sa skarmen "lyser" i morka scener
- Lagg till en `pointLight` framfor skarmen (intensitet 0.5-1) som kastar skarmsken pa vaggar/golv
- Lagg till en tunn ljusbla glow-plane bakom skarmen (stor och transparent) for att simulera ambient screen bleed

### 2. Default-bild nar ingen media spelas (drawScreenCanvas)

Nar det inte finns nagon media-state, rita en snygg default-vy:

- Gradient-bakgrund (morkbla till morkilla)
- Stor centered monitor/TV-ikon (ritad med canvas paths)
- Text "REDO" eller "Standby" med dimmad text
- Subtil animerad "scanline"-effekt via useFrame som uppdaterar texturen periodiskt

Nar media spelar:

- Ljusare bakgrund med gradient
- Storre text for titel
- Source-label med fargad bakgrund (Netflix = rod, Spotify = gron, default = indigo)

### 3. Bygglagets markering -- tydligare urval

- Nar skarmen ar vald i bygglaaget: visa en tydlig glodande ram (tjockare, ljusare, pulsande)
- Lagg till fyra smala horn-markeringar i skarmens hornn sa man ser var den ar aven nar den inte ar vald

### 4. Korrigera default-rotation

- Andra default-rotation fran `[0, 0, 0]` till `[0, 0, 0]` (planeGeometry ar redan vertikal)
- Men lagg till en liten Y-rotation offset sa skarmen inte ar exakt parallell med grid-linjerna (lattare att se fran kamerans default-vinkel)

## Tekniska detaljer

### Filandringar

| Fil | Andring |
|-----|---------|
| `DeviceMarkers3D.tsx` | Byt material till emissivt, lagg till pointLight, forbattra drawScreenCanvas med default-bild, lagg till horn-markeringar |
| `BuildScene3D.tsx` | Ingen andring -- rotation och scale ar redan korrekta |

### drawScreenCanvas -- ny default-vy

```text
function drawScreenCanvas(canvas, ctx, mediaState, config):
  if no media:
    1. Rita gradient bakgrund (dark blue -> dark purple)
    2. Rita stor TV-ikon i mitten (linjer, inte fylld)
    3. Rita "Standby" text under ikonen
    4. Rita tunn ram runt hela canvasen
  else:
    1. Rita morkare gradient bakgrund
    2. Rita source-label med fargad bakgrund
    3. Rita stor titel
    4. Rita play/pause
    5. Rita progress bar
```

### Emissiv belysning

```text
MediaScreenMarker:
  <group>
    <pointLight position={[0, 0, 0.3]} intensity={0.8} color="#818cf8" distance={3} />
    <mesh> // Screen
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={texture} emissive="#ffffff" emissiveIntensity={0.3} />
    </mesh>
    <mesh> // Bezel
      ...
    </mesh>
    // Corner markers (4x small boxes at corners)
  </group>
```

