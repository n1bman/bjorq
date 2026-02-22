import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, BuildTool } from '@/store/types';
import { Lightbulb, ToggleLeft, Activity, Thermometer, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const deviceTools: { key: BuildTool; kind: DeviceKind; label: string; icon: typeof Lightbulb; color: string }[] = [
  { key: 'place-light', kind: 'light', label: 'Ljus', icon: Lightbulb, color: 'text-yellow-400' },
  { key: 'place-switch', kind: 'switch', label: 'Knapp', icon: ToggleLeft, color: 'text-blue-400' },
  { key: 'place-sensor', kind: 'sensor', label: 'Sensor', icon: Activity, color: 'text-green-400' },
  { key: 'place-climate', kind: 'climate', label: 'Klimat', icon: Thermometer, color: 'text-cyan-400' },
];

const kindLabels: Record<DeviceKind, string> = {
  light: '💡 Ljus',
  switch: '🔌 Knapp',
  sensor: '🌡️ Sensor',
  climate: '❄️ Klimat',
  vacuum: '🤖 Dammsugare',
};

export default function DevicePlacementTools() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const markers = useAppStore((s) => s.devices.markers);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const removeDevice = useAppStore((s) => s.removeDevice);

  const floorMarkers = markers.filter((m) => m.floorId === activeFloorId);

  return (
    <div className="flex flex-col gap-2">
      <div className="px-2 hidden lg:block">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Placera enhet
        </h3>
      </div>

      <div className="flex flex-col gap-0.5">
        {deviceTools.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setBuildTool(key)}
            title={label}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg text-xs font-medium transition-all min-h-[44px]',
              'lg:justify-start justify-center',
              activeTool === key
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
            )}
          >
            <Icon size={18} className={activeTool === key ? color : ''} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>

      {floorMarkers.length > 0 && (
        <div className="border-t border-border mt-2 pt-2 px-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 hidden lg:block">
            Placerade ({floorMarkers.length})
          </p>
          <div className="flex flex-col gap-0.5 max-h-[30vh] overflow-y-auto">
            {floorMarkers.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-secondary/20">
                <span className="hidden lg:inline truncate">{m.name || kindLabels[m.kind]}</span>
                <button
                  onClick={() => removeDevice(m.id)}
                  className="text-destructive/60 hover:text-destructive p-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
