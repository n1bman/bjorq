

# Fix: Guards mot okanda enhetstyper i alla komponenter

## Problem

Trots att `media_screen` finns i alla maps (`kindInfo`, `deviceIcons`, `markerComponents`) kraschar appen for att localStorage kan innehalla enheter med en `kind` som inte matchar nagon nyckel. Felet ar i **DevicesSection.tsx rad 52** dar `kindInfo[d.kind]` returnerar `undefined` och sedan `.emoji` kraschar.

Samma sarbarhet finns i **RoomCard.tsx rad 53** (`deviceIcons[kind]` kan vara undefined).

## Losning

Tre andringar:

### 1. DevicesSection.tsx -- lagg till guard (rad 52)

Efter `const info = kindInfo[d.kind]`, lagg till:
```tsx
if (!info) return null;
```
Detta hoppar over enheter med okand `kind` istallet for att krasha.

### 2. RoomCard.tsx -- lagg till guard (rad 53)

Efter `const Icon = deviceIcons[kind as DeviceKind]`, lagg till:
```tsx
if (!Icon) return null;
```

### 3. useAppStore.ts -- bumpa version till 11

Tvingar bort eventuell korrupt data fran localStorage.

