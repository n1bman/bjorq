import { useAppStore } from '@/store/useAppStore';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function FloorManager() {
  const floors = useAppStore((s) => s.layout.floors);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const addFloor = useAppStore((s) => s.addFloor);
  const removeFloor = useAppStore((s) => s.removeFloor);
  const renameFloor = useAppStore((s) => s.renameFloor);
  const setActiveFloor = useAppStore((s) => s.setActiveFloor);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activeFloor = floors.find((f) => f.id === activeFloorId);

  const handleAdd = () => {
    const num = floors.length + 1;
    addFloor(`Våning ${num}`);
  };

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameFloor(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Active floor header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-medium">{activeFloor?.name ?? 'Ingen våning'}</span>
        </div>
        <ChevronDown
          size={16}
          className={cn('text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {/* Floor list */}
      {expanded && (
        <div className="border-t border-border">
          {floors.map((floor) => (
            <div
              key={floor.id}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer',
                floor.id === activeFloorId
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary/20 text-foreground'
              )}
              onClick={() => {
                setActiveFloor(floor.id);
                setExpanded(false);
              }}
            >
              {editingId === floor.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-primary text-sm outline-none w-32 text-foreground"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(floor.id, floor.name);
                  }}
                >
                  {floor.name}
                </span>
              )}
              {floors.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFloor(floor.id);
                  }}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAdd}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
          >
            <Plus size={14} />
            Lägg till våning
          </button>
        </div>
      )}
    </div>
  );
}
