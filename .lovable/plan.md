

# Vägg-snapping till befintliga noder + visuell feedback

## Problem
När du ritar väggar snappar de bara till rutnätet — aldrig till befintliga väggnoder. Om du ritar ett rum bredvid ett annat och försöker ansluta väggarna, hamnar noderna inte exakt på samma koordinat → rumsdetekteringen missar kopplingen → rum skapas inte.

## Lösning

### 1. Node-snap-funktion (`snapToNode`)
Ny hjälpfunktion som, givet en position, söker bland alla befintliga väggnoder på aktiv våning. Om en nod finns inom 0.25m → snappa till den exakta positionen. Appliceras **efter** grid-snap men **före** lagring.

### 2. Applicera i båda vyerna

**`BuildCanvas2D.tsx`** (2D-ritning):
- I wall-drawing-klicket (rad ~1244): efter `snapToGrid`, kör `snapToNode` som kan justera till en befintlig vägg-endpoint
- I rendering-loopen (rad ~670): snappa cursorpositionen för att visa preview-linjen mot rätt punkt
- Ny visuell indikator: rita en **grön cirkel** runt noden man snappar till (liknande auto-close-cirkeln men grön)

**`BuildScene3D.tsx`** (3D-ritning):
- I `handleGroundPointerDown` (rad 171): samma snap-logik efter `snapToGrid`
- I `handleGroundPointerMove` (rad 190): snappa cursor för korrekt preview

### 3. Visuell feedback i 2D-canvasen
- **Grön ring** (⭕) runt noder som redan har 2+ anslutna väggar (= "slutna" noder)
- **Orange ring** runt noder med 1 anslutning (= öppen ände att ansluta till)
- Vid snap: **pulsande grön cirkel** + snap-linje blir grön istället för orange

### 4. Visuell feedback i 3D (`WallDrawing3D.tsx`)
- Cursor-sfären byter färg till grön (#4ade80) när den snappar till en befintlig nod
- Lite större sfär (0.1 istället för 0.06) för att tydligt visa "anslutning"

### Teknisk implementation

Ny funktion i `BuildCanvas2D.tsx` och `BuildScene3D.tsx`:
```typescript
const snapToNode = (pos: [number, number], walls: WallSegment[], threshold = 0.25): [number, number] | null => {
  for (const w of walls) {
    if (Math.hypot(pos[0] - w.from[0], pos[1] - w.from[1]) < threshold) return w.from;
    if (Math.hypot(pos[0] - w.to[0], pos[1] - w.to[1]) < threshold) return w.to;
  }
  return null;
};
```

Ändrade filer: `BuildCanvas2D.tsx`, `BuildScene3D.tsx`, `WallDrawing3D.tsx`

