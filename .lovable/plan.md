

# TV-skarm: Visuella forbattringar

## Andring 1: Bygglageshjalp doljs i hemvyn

Hornmarkorer (4 rutor) och ambient glow-planet (det ljusa lagret bakom) visas **bara i bygglageet**. `MediaScreenMarker` far en ny `buildMode`-prop.

## Andring 2: Morkare, mer realistisk skarm

- Now Playing-gradient andras fran `#0f172a`/`#312e81` till `#050510`/`#0a0a1f` for OLED-kansla
- `emissiveIntensity` pa skarmplanets material sanks fran 0.4 till 0.15
- Standby-gradient morkare

## Andring 3: App-logotyper med fargschema

Branding-tabell baserat pa `app_name`/`source` fran HA:

| App | Farg | Badge-text |
|-----|------|------------|
| YouTube | `#FF0000` | YOUTUBE |
| Netflix | `#E50914` | NETFLIX |
| Prime Video | `#00A8E1` | PRIME VIDEO |
| HBO Max | `#B535F6` | HBO MAX |
| SVT Play | `#2DAB4F` | SVT PLAY |
| Spotify | `#1DB954` | SPOTIFY |
| Disney+ | `#113CCF` | DISNEY+ |
| Plex | `#E5A00D` | PLEX |

Badgen ritas storre och snyggare med rundade horn. `media_artist` visas under titeln nar det finns.

## Andring 4: Pulserande ambient-ljus

Nar skarmen ar pa (state !== "off"/"standby"/"idle"/"unavailable"):

- `pointLight` far en `useRef` och animeras med `useFrame`
- Intensiteten pulserar mjukt: `0.3 + sin(time * 0.002) * 0.2`
- Ljusfarg foljer app-branding (rod for YouTube, gron for Spotify, etc.)
- Nar skarmen ar av: intensitet ~0.05

## Fil som andras

| Fil | Andring |
|-----|---------|
| `src/components/devices/DeviceMarkers3D.tsx` | Allt ovan: buildMode-prop till MediaScreenMarker, villkorlig rendering av horn/glow, morkare canvas, app-branding, pulserande ljus, artist-text |

Renderingsflode efter andring:

```text
MediaScreenMarker
  +-- pointLight (ref-styrd, pulserande i useFrame)
  +-- Screen plane (morkare emissive)
  +-- Bezel (alltid -- ser ut som TV-ram)
  +-- [buildMode] Ambient glow plane
  +-- [buildMode] Corner markers
  +-- [selected] Selection glow frame
```

