import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { MapPin, Trash2, PenTool, Home as HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuildTool } from '@/store/types';

export default function VacuumMappingTools() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const markers = useAppStore((s) => s.devices.markers);
  const removeVacuumZone = useAppStore((s) => s.removeVacuumZone);

  const floor = floors.find((f) => f.id === activeFloorId);
  const hasVacuum = markers.some((m) => m.kind === 'vacuum' && m.floorId === activeFloorId);
  const mapping = floor?.vacuumMapping;

  if (!hasVacuum) return null;

  return (
    <div className="border-t border-border mt-3 pt-3 px-2">
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 hidden lg:block">
        Robot Mapping
      </h4>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => setBuildTool('place-vacuum-dock' as BuildTool)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'lg:justify-start justify-center',
            activeTool === 'place-vacuum-dock'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <HomeIcon size={16} />
          <span className="hidden lg:inline">Placera docka</span>
        </button>

        <button
          onClick={() => setBuildTool('vacuum-zone' as BuildTool)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'lg:justify-start justify-center',
            activeTool === 'vacuum-zone'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <PenTool size={16} />
          <span className="hidden lg:inline">Rita robotzon</span>
        </button>
      </div>

      {/* Dock status */}
      {mapping?.dockPosition && (
        <div className="mt-2 px-1 text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin size={12} className="text-green-400" />
          <span>Docka: ({mapping.dockPosition[0].toFixed(1)}, {mapping.dockPosition[1].toFixed(1)})</span>
        </div>
      )}

      {/* Zone list */}
      {mapping?.zones && mapping.zones.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider px-1 hidden lg:block">
            Zoner ({mapping.zones.length})
          </p>
          {mapping.zones.map((zone) => (
            <div key={zone.roomId} className="flex items-center justify-between px-2 py-1 rounded text-[10px] text-muted-foreground hover:bg-secondary/20">
              <span className="truncate">{zone.roomId} ({zone.polygon.length} pkt)</span>
              <button
                onClick={() => activeFloorId && removeVacuumZone(activeFloorId, zone.roomId)}
                className="text-destructive/60 hover:text-destructive p-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
