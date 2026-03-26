

# Enhets-widgets som enhetliga kort (inte pill + popup)

## Problem

Idag renderas enhets-widgets som små pill-knappar med en separat expand-panel under. Användaren vill att de ska se ut som riktiga kort (som i bild 3) — ett enda sammanhängande kort med titel, status, kontroller och extra funktioner direkt synliga.

## Lösning

Ersätt den nuvarande pill + expand-popup-strukturen i `HomeView.tsx` med ett enda kort per enhet. Kortet visar alltid grundinfo och kontroller — inget expand-steg behövs.

### Kort-design per enhetstyp

**TV / media_screen:**
- Header: ikon + namn + grön dot
- Rad: media-titel (truncated)
- Kontroller: prev, pause/play, next, stop — inline rad

**Vacuum:**
- Header: ikon + namn + status (Städar/Dockad) + batteri %
- Kontroller: Städa, Paus, Stopp, Docka, Hitta — inline rad
- Rumsval: rumsknappar (från vacuum zones) — inline rad under

**Speaker / Soundbar:**
- Header: ikon + namn + grön dot
- Rad: nuvarande låttitel (truncated)
- Kontroller: pause/play, stop + volym (−/+/%)

**Light:**
- Header: ikon + namn + av/på dot
- Ljusstyrke-slider inline

**Climate:**
- Header: ikon + namn
- Temp: −/temp/+ inline

**Fan:**
- Header: ikon + namn
- Knappar: Låg/Medium/Hög/Av

**Övriga (switch, sensor, etc):**
- Ikon + namn + toggle/status dot (som idag)

### Implementation

**`src/components/home/HomeView.tsx`** — rad 218-378:

Ersätt hela `<button>` + expand-paneler med ett enda `<div>` per enhet:

```tsx
<div key={m.id} className="absolute z-10 pointer-events-auto" style={...}>
  <div className={cn(
    'glass-panel rounded-2xl backdrop-blur-xl border border-[hsl(var(--glass-border)/0.15)]',
    'shadow-lg min-w-[180px] max-w-[260px]',
    isOn && 'border-[hsl(var(--primary)/0.25)]'
  )}
    onPointerDown={...} onPointerUp={...} // long-press
  >
    {/* Header — always visible */}
    <div className="flex items-center gap-2 px-3 py-2.5">
      <Icon size={16} className={isOn ? 'text-primary' : 'text-muted-foreground'} />
      <span className="text-[13px] font-semibold truncate flex-1">{name}</span>
      <dot />
    </div>
    
    {/* Type-specific content — always visible, no expand */}
    {renderDeviceControls(m, ...)}
  </div>
</div>
```

Varje enhetstyp renderar sina kontroller direkt i kortet via en `renderDeviceControls` helper. Ingen expand/collapse — allt visas.

- Ta bort `expandedPillId` state och `ChevronDown`-ikonen
- Ta bort alla separata expand-paneler (`mt-2` divs)
- Flytta kontrollerna in i samma kort-div

Vacuum-kortet hämtar rumszoner från `vacuumZones` i store och visar dem som knappar (som i bild 3).

Speaker/media hämtar `liveStates` för att visa aktuell låttitel och volym.

### Volym-bugg fix

Volymen visar `0.208331421...%` — volume-värdet är 0-1 men visas rått. Fix: `Math.round(volume * 100)` för display.

## Filer som ändras

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeView.tsx` | Ersätt pill+expand med enhetliga kort, ta bort expandedPillId |

