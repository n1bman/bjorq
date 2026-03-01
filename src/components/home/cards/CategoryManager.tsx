import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Plus, Trash2, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { DeviceCategory, DeviceMarker } from '../../../store/types';

const defaultEmojis = ['🏠', '💡', '❄️', '🔒', '📺', '🤖', '⚡', '🌡️', '📷', '🧊'];

export default function CategoryManager() {
  const customCategories = useAppStore((s) => s.customCategories);
  const markers = useAppStore((s) => s.devices.markers);
  const addCategory = useAppStore((s) => s.addCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const renameCategory = useAppStore((s) => s.renameCategory);
  const setCategoryIcon = useAppStore((s) => s.setCategoryIcon);
  const moveDeviceToCategory = useAppStore((s) => s.moveDeviceToCategory);

  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏠');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [moveDeviceId, setMoveDeviceId] = useState<string | null>(null);

  // Find uncategorized devices
  const categorizedIds = new Set(customCategories.flatMap((c) => c.deviceIds));
  const uncategorized = markers.filter((m) => !categorizedIds.has(m.id));

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCategory(newName.trim(), newIcon);
    setNewName('');
  };

  const selectedCat = customCategories.find((c) => c.id === selectedCatId);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Hantera kategorier</h3>

      {/* Create new */}
      <div className="flex gap-2">
        <div className="flex gap-1">
          {defaultEmojis.slice(0, 5).map((e) => (
            <button key={e} onClick={() => setNewIcon(e)}
              className={cn('w-7 h-7 rounded text-sm', newIcon === e ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary/30')}>
              {e}
            </button>
          ))}
        </div>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nytt namn..."
          className="h-7 text-xs flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAdd} disabled={!newName.trim()}>
          <Plus size={12} />Skapa
        </Button>
      </div>

      {/* Category list */}
      <div className="space-y-2">
        {customCategories.map((cat) => (
          <div key={cat.id} className={cn(
            'glass-panel rounded-xl p-3 cursor-pointer transition-all',
            selectedCatId === cat.id && 'ring-1 ring-primary/40'
          )} onClick={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-xs font-medium text-foreground">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">{cat.deviceIds.length} enheter</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); removeCategory(cat.id); }}>
                  <Trash2 size={12} className="text-destructive" />
                </Button>
                <ChevronRight size={12} className={cn('text-muted-foreground transition-transform', selectedCatId === cat.id && 'rotate-90')} />
              </div>
            </div>

            {selectedCatId === cat.id && (
              <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                {cat.deviceIds.map((did) => {
                  const m = markers.find((mk) => mk.id === did);
                  if (!m) return null;
                  return (
                    <div key={did} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground">{m.name || m.kind}</span>
                    </div>
                  );
                })}
                {cat.deviceIds.length === 0 && <p className="text-[10px] text-muted-foreground">Inga enheter i denna kategori</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Uncategorized devices */}
      {uncategorized.length > 0 && customCategories.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Okategoriserade ({uncategorized.length})</h4>
          {uncategorized.map((d) => (
            <div key={d.id} className="flex items-center justify-between glass-panel rounded-lg px-3 py-2">
              <span className="text-xs text-foreground">{d.name || d.kind}</span>
              {moveDeviceId === d.id ? (
                <div className="flex gap-1">
                  {customCategories.map((cat) => (
                    <button key={cat.id} onClick={() => { moveDeviceToCategory(d.id, cat.id); setMoveDeviceId(null); }}
                      className="text-[10px] bg-secondary/50 rounded px-2 py-0.5 hover:bg-primary/20">
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1"
                  onClick={() => setMoveDeviceId(d.id)}>
                  <ArrowRight size={10} />Flytta
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {customCategories.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Skapa en kategori ovan för att börja organisera dina enheter
        </p>
      )}
    </div>
  );
}
