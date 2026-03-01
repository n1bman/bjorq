import { useAppStore } from '../../../store/useAppStore';
import { roomTemplates, templateCategoryLabels, templateCategoryIcons } from '../../../lib/roomTemplates';
import type { RoomTemplateCategory } from '../../../store/types';
import { useState } from 'react';
import { cn } from '../../../lib/utils';

const categories: RoomTemplateCategory[] = ['bedroom', 'kitchen', 'livingroom', 'bathroom'];

export default function TemplatesPicker() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const addRoomFromRect = useAppStore((s) => s.addRoomFromRect);
  const [activeCategory, setActiveCategory] = useState<RoomTemplateCategory>('bedroom');

  const filtered = roomTemplates.filter((t) => t.category === activeCategory);

  const handlePlace = (tpl: typeof roomTemplates[0]) => {
    if (!activeFloorId) return;
    // Place at origin (user can move later)
    addRoomFromRect(activeFloorId, 0, 0, tpl.width, tpl.depth, tpl.name);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Rummallar
      </h4>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all min-h-[36px]',
              activeCategory === cat
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
            )}
          >
            <span>{templateCategoryIcons[cat]}</span>
            <span className="hidden lg:inline">{templateCategoryLabels[cat]}</span>
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="space-y-1">
        {filtered.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => handlePlace(tpl)}
            className="w-full flex items-center justify-between px-2 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-xs transition-all min-h-[44px]"
          >
            <div className="flex flex-col items-start">
              <span className="text-foreground font-medium">{tpl.name}</span>
              <span className="text-muted-foreground text-[10px]">
                {tpl.width} × {tpl.depth} m
              </span>
            </div>
            <div
              className="w-8 h-8 border border-border rounded-sm bg-secondary/20 flex items-center justify-center"
              title={`${tpl.width}×${tpl.depth} m`}
            >
              <div
                className="bg-primary/30 rounded-[2px]"
                style={{
                  width: `${(tpl.width / 6) * 100}%`,
                  height: `${(tpl.depth / 6) * 100}%`,
                  minWidth: 4,
                  minHeight: 4,
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
