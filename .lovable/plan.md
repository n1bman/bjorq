

# Fix: Widget-drag hopp, återställ-knapp, safezone, utökade enhets-kontroller

## Problem

1. **Widget hoppar vid första drag** — `handlePointerDown` i `HomeLayoutEditor.tsx` rad 115 använder `DEFAULT_POSITIONS[key] ?? { x: 50, y: 50 }` som fallback. Device-markers har inte statiska entries i `DEFAULT_POSITIONS`, så de faller tillbaka till `{ x: 50, y: 50 }` (mitten) trots att deras visuella position är staggerad via `getDefaultPos()`. Dragstart-referenspunkten matchar inte var widgeten faktiskt renderas → widgeten hoppar till mitten vid första rörelsen.

2. **Ingen "Återställ"-knapp** i layoutläget.

3. **Ingen safezone** — widgets kan dras bakom layoutpanelen (mitten av skärmen) och bli omöjliga att nå.

4. **Bara vacuum/climate/media har expand** — ljus (dimmer), högtalare (volym), fläkt (hastighet) saknar inline-kontroller i hemvy-widgetarna.

---

## Fix 1: Drag-hopp (rotorsak)

**Fil:** `src/components/home/HomeLayoutEditor.tsx` rad 110-118

Ändra `handlePointerDown` så att den för device-markers använder `getDefaultPos(key, idx)` istället för hårdkodad `{ x: 50, y: 50 }`:

```ts
const handlePointerDown = useCallback((key: string, e: React.PointerEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setDragging(key);
  const config = widgetLayout[key];
  // Use getDefaultPos which handles both widget and device defaults
  const defIdx = selectedMarkers.findIndex((m) => m.id === key);
  const defPos = getDefaultPos(key, defIdx >= 0 ? defIdx : 0);
  const pos = { x: config?.x ?? defPos.x, y: config?.y ?? defPos.y };
  dragStartRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  containerRef.current?.setPointerCapture(e.pointerId);
}, [widgetLayout, selectedMarkers]);
```

Nyckeln: `getDefaultPos` hanterar redan device-staggering (rad 103-108), men `handlePointerDown` använde den inte.

## Fix 2: Återställ-knapp

**Fil:** `src/components/home/HomeLayoutEditor.tsx`

Lägg till en `RotateCcw`-ikon-knapp bredvid "Klar" i header:

```tsx
import { RotateCcw } from 'lucide-react';

// I header-raden (rad 259):
<button
  onClick={() => {
    // Reset all widget positions to defaults
    Object.entries(DEFAULT_POSITIONS).forEach(([k, pos]) => {
      setWidgetLayout(k, { x: pos.x, y: pos.y });
    });
    // Reset device positions
    selectedMarkers.forEach((m, idx) => {
      const defPos = getDefaultPos(m.id, idx);
      setWidgetLayout(m.id, { x: defPos.x, y: defPos.y });
    });
  }}
  className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-[hsl(var(--surface-elevated)/0.5)] transition-colors"
>
  <RotateCcw size={13} />
</button>
```

## Fix 3: Safezone — blockera placering i mittområdet

**Fil:** `src/components/home/HomeLayoutEditor.tsx` rad 121-128

Lägg till safezone-check i `handlePointerMove`. Layoutpanelen är ca 480px bred, centrerad — det motsvarar ungefär x: 25-75%, y: 25-75%. Widgeten ska kunna passera genom men "snäppa" ut om den hamnar helt inuti zonen:

Enklare approach: visa en visuell varning (röd ring) om widgeten är i safezone, men tillåt placering. Alternativt: ingen clamp, bara visuell indikator. Användaren kan sedan flytta.

**Vald approach:** Visuell varning + tooltiptext. Ingen hård blockering (det frusterar mer).

I dropplogiken, kontrollera om position är x: 28-72, y: 30-70 och visa en subtil röd outline på widgeten:

```tsx
const inSafeZone = pos.x > 28 && pos.x < 72 && pos.y > 30 && pos.y < 70;
// ... i widget-klassen:
inSafeZone && !isDragging && 'ring-red-500/50'
```

## Fix 4: Expanderbara kontroller för fler enhetstyper

**Fil:** `src/components/home/HomeView.tsx`

Utöka `hasExpand` från rad 203:
```ts
const hasExpand = m.kind === 'vacuum' || m.kind === 'climate' || m.kind === 'media_screen' 
  || m.kind === 'light' || m.kind === 'fan' || m.kind === 'speaker' || m.kind === 'soundbar';
```

Lägg till inline expand-paneler:

**Ljus (light)** — dimmer-slider + on/off:
```tsx
{isExpanded && m.kind === 'light' && (() => {
  const lightData = deviceStates[m.id]?.data as any;
  const brightness = lightData?.brightness ?? 255;
  return (
    <div className="glass-panel rounded-2xl p-3 mt-2 ...">
      <span className="text-xs text-muted-foreground">Ljusstyrka</span>
      <input type="range" min={0} max={255} value={brightness}
        onChange={(e) => callSvc('light', 'turn_on', { brightness: +e.target.value })} 
        className="flex-1 accent-[hsl(var(--primary))]" />
      <button onClick={() => callSvc('light', isOn ? 'turn_off' : 'turn_on')}
        className="px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium">
        {isOn ? 'Av' : 'På'}
      </button>
    </div>
  );
})()}
```

**Fläkt (fan)** — hastighet:
```tsx
{isExpanded && m.kind === 'fan' && (
  <div className="glass-panel rounded-2xl p-3 mt-2 flex flex-wrap gap-2 ...">
    <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 33 })} ...>Låg</button>
    <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 66 })} ...>Medium</button>
    <button onClick={() => callSvc('fan', 'set_percentage', { percentage: 100 })} ...>Hög</button>
    <button onClick={() => callSvc('fan', isOn ? 'turn_off' : 'turn_on')} ...>{isOn ? 'Av' : 'På'}</button>
  </div>
)}
```

**Högtalare/Soundbar (speaker/soundbar)** — volym + play/pause:
```tsx
{isExpanded && (m.kind === 'speaker' || m.kind === 'soundbar') && (() => {
  const mediaData = deviceStates[m.id]?.data as any;
  const volume = mediaData?.volume ?? 50;
  return (
    <div className="glass-panel rounded-2xl p-3 mt-2 ...">
      <button onClick={() => callSvc('media_player', isOn ? 'media_pause' : 'media_play')} ...>
        {isOn ? 'Paus' : 'Spela'}
      </button>
      <span className="text-xs text-muted-foreground">Vol</span>
      <button onClick={() => callSvc('media_player', 'volume_set', { volume_level: Math.max(0, (volume-10)/100) })} ...><Minus size={12}/></button>
      <span className="text-sm font-bold min-w-[3ch] text-center">{volume}%</span>
      <button onClick={() => callSvc('media_player', 'volume_set', { volume_level: Math.min(100, (volume+10)/100) })} ...><Plus size={12}/></button>
    </div>
  );
})()}
```

Alla expand-paneler använder **samma visuella stil** — `glass-panel rounded-2xl p-3 mt-2 backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]` med `animate-in fade-in slide-in-from-top-2`.

---

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeLayoutEditor.tsx` | Fix drag-fallback, lägg till Återställ-knapp, safezone-varning |
| `src/components/home/HomeView.tsx` | Expand-paneler för light/fan/speaker/soundbar |

