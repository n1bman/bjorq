import { useAppStore } from '@/store/useAppStore';
import type { VacuumState, DeviceMarker } from '@/store/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Battery, Play, Square, Home as HomeIcon, MapPin, AlertTriangle,
  Clock, Ruler, Wind, Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder',
  paused: 'Pausad', idle: 'Väntar', error: 'Fel',
};
const statusColors: Record<string, string> = {
  cleaning: 'text-blue-400', docked: 'text-green-400', returning: 'text-orange-400',
  paused: 'text-yellow-400', idle: 'text-muted-foreground', error: 'text-destructive',
};

function BatteryIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <Battery size={18} className={level > 50 ? 'text-green-400' : level > 20 ? 'text-yellow-400' : 'text-red-400'} />
      <div className="flex-1">
        <Progress value={level} className="h-2" />
      </div>
      <span className="text-xs font-medium text-foreground min-w-[32px] text-right">{level}%</span>
    </div>
  );
}

function FanSpeedSelector({ data, id, update }: { data: VacuumState; id: string; update: (id: string, p: Record<string, unknown>) => void }) {
  const presets = data.fanSpeedList ?? ['Silent', 'Standard', 'Medium', 'Turbo', 'Max'];
  const presetSpeeds: Record<string, number> = { silent: 20, standard: 40, medium: 60, turbo: 80, max: 100 };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wind size={14} />
        <span>Sugeffekt {data.fanSpeed ?? 0}%</span>
      </div>
      <Slider
        value={[data.fanSpeed ?? 50]}
        max={100}
        step={5}
        onValueChange={([v]) => update(id, { fanSpeed: v })}
      />
      <div className="flex gap-1 flex-wrap">
        {presets.map((p) => {
          const speed = presetSpeeds[p.toLowerCase()] ?? 50;
          const active = Math.abs((data.fanSpeed ?? 0) - speed) < 10;
          return (
            <Button key={p} size="sm" variant={active ? 'default' : 'outline'}
              className="h-6 text-[9px] px-2"
              onClick={() => update(id, { fanSpeed: speed })}>
              {p}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function RobotPanel() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);

  const vacuumMarkers = markers.filter((m) => m.kind === 'vacuum');

  if (vacuumMarkers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground">Ingen robotdammsugare hittad</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Bygge → Enheter för att placera en</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vacuumMarkers.map((marker) => {
        const state = deviceStates[marker.id];
        if (!state || state.kind !== 'vacuum') return null;
        return (
          <VacuumCard key={marker.id} marker={marker} data={state.data} update={updateDeviceState} />
        );
      })}
    </div>
  );
}

function VacuumCard({ marker, data, update }: { marker: DeviceMarker; data: VacuumState; update: (id: string, p: Record<string, unknown>) => void }) {
  const id = marker.id;
  const statusColor = statusColors[data.status] ?? 'text-muted-foreground';
  const statusLabel = statusLabels[data.status] ?? data.status;

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4">
      {/* Header: Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center bg-secondary', statusColor)}>
            {data.status === 'error' ? <AlertTriangle size={20} /> : <span className="text-lg">🤖</span>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{marker.name || 'Robotdammsugare'}</h3>
            <p className={cn('text-xs font-medium', statusColor)}>{statusLabel}</p>
          </div>
        </div>
        {marker.ha?.entityId && (
          <span className="text-[9px] text-muted-foreground/50 font-mono">{marker.ha.entityId}</span>
        )}
      </div>

      {/* Error message */}
      {data.status === 'error' && data.errorMessage && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg p-2">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-xs text-destructive">{data.errorMessage}</p>
        </div>
      )}

      {/* Battery */}
      <BatteryIndicator level={data.battery} />

      {/* Control buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant={data.status === 'cleaning' ? 'default' : 'outline'}
          className="flex-1 h-9 text-xs gap-1"
          onClick={() => update(id, { on: true, status: 'cleaning' })}>
          <Play size={14} /> Starta
        </Button>
        <Button size="sm" variant={data.status === 'paused' ? 'default' : 'outline'}
          className="flex-1 h-9 text-xs gap-1"
          onClick={() => update(id, { status: 'paused' })}>
          <Pause size={14} /> Pausa
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1"
          onClick={() => update(id, { on: false, status: 'docked' })}>
          <Square size={14} /> Stoppa
        </Button>
        <Button size="sm" variant="outline" className="h-9 text-xs gap-1"
          onClick={() => update(id, { status: 'returning' })}>
          <HomeIcon size={14} />
        </Button>
      </div>

      {/* Locate */}
      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1"
        onClick={() => update(id, { _action: 'locate' })}>
        <MapPin size={14} /> Lokalisera (pip)
      </Button>

      {/* Fan speed */}
      <FanSpeedSelector data={data} id={id} update={update} />

      {/* Statistics */}
      {(data.cleaningArea !== undefined || data.cleaningTime !== undefined) && (
        <div className="flex gap-3">
          {data.cleaningArea !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ruler size={14} />
              <span>{data.cleaningArea} m²</span>
            </div>
          )}
          {data.cleaningTime !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>{data.cleaningTime} min</span>
            </div>
          )}
        </div>
      )}

      {/* Map placeholder */}
      <div className="rounded-lg bg-secondary/50 border border-border aspect-video flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground">Karta (framtida Valetudo-integration)</p>
      </div>
    </div>
  );
}
