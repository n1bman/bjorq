

# Fix: Enhets-widgets blockeras av layoutpanelen

## Rotorsak

Konfigurationspanelen i layoutläget har `z-50` och täcker mitten av skärmen. Enhets-widgets (TV, vacuum, etc.) har `z-10` och ligger bakom panelen. Pointer events når aldrig widgetarna om de befinner sig under panelen.

## Fix

**`src/components/home/HomeLayoutEditor.tsx`** — 2 ändringar:

### 1. Config-panelens wrapper: `pointer-events-none`, inner panel: `pointer-events-auto`

Rad 249: Lägg till `pointer-events-none` på den yttre wrapper-diven. Lägg till `pointer-events-auto` på den inre `nn-widget`-diven.

```tsx
{/* Config panel */}
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[calc(100vw-2rem)] z-50 pointer-events-none">
  <div className="nn-widget p-6 shadow-2xl space-y-5 pointer-events-auto">
```

Detta gör att pointer events passerar genom till widgets som befinner sig utanför panelens yta, men panelens knappar fungerar fortfarande.

### 2. Ge draggable widgets högre z-index

Rad 169/216: Byt `z-10` till `z-20` för alla draggable element (både standard-widgets och device-widgets), och `z-[55]` vid dragning (över panelens z-50).

```tsx
isDragging ? 'cursor-grabbing z-[55]' : 'cursor-grab z-20',
```

Detta gör att man kan dra en widget *över* panelen om man vill.

## Filer

| Fil | Ändring |
|-----|---------|
| `src/components/home/HomeLayoutEditor.tsx` | pointer-events-none på panel-wrapper, höjd z-index på draggables |

