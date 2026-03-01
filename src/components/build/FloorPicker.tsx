import { useAppStore } from '../../store/useAppStore';
import { Plus, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export default function FloorPicker() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const addFloor = useAppStore((s) => s.addFloor);
  const setActiveFloor = useAppStore((s) => s.setActiveFloor);
  const floorFilter = useAppStore((s) => s.build.view.floorFilter);
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState(false);

  const activeFloor = floors.find((f) => f.id === activeFloorId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-sm text-foreground transition-all min-h-[44px]"
      >
        <span>{floorFilter === 'all' ? 'Våningar' : activeFloor?.name ?? 'Välj våning'}</span>
        <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl overflow-hidden z-[200] shadow-xl pointer-events-auto p-1">
          <button
            onClick={() => { setView({ floorFilter: 'all' }); setOpen(false); }}
            className={cn(
              'w-full text-left px-3 py-2.5 text-sm transition-colors min-h-[44px]',
              floorFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/20'
            )}
          >
            Alla våningar (visa alla)
          </button>
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => {
                setActiveFloor(floor.id);
                setView({ floorFilter: floor.id });
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors min-h-[44px]',
                activeFloorId === floor.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/20'
              )}
            >
              {floor.name}
            </button>
          ))}
          <button
            onClick={() => {
              const name = `Våning ${floors.length + 1}`;
              addFloor(name);
              setTimeout(() => {
                const state = useAppStore.getState();
                const newFloor = state.layout.floors[state.layout.floors.length - 1];
                if (newFloor) {
                  setActiveFloor(newFloor.id);
                  setView({ floorFilter: newFloor.id });
                }
              }, 0);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors min-h-[44px]"
          >
            <Plus size={14} /> Lägg till
          </button>
        </div>
      )}
    </div>
  );
}
