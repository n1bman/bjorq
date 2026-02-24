import { useAppStore } from '@/store/useAppStore';
import type { DeviceMarker, LightState, ClimateState, MediaState, VacuumState, LockState, SensorState, GenericDeviceState } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Sun, Thermometer, Play, Pause, Square, Volume2,
  Lock, Unlock, Battery, Home as HomeIcon,
  Snowflake, Flame, RotateCcw, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { marker: DeviceMarker }
type UpdateFn = (id: string, partial: Record<string, unknown>) => void;

export default function DeviceControlCard({ marker }: Props) {
  const state = useAppStore((s) => s.devices.deviceStates[marker.id]);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  if (!state) return null;

  switch (state.kind) {
    case 'light': return <LightControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'climate': return <ClimateControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'media_screen': return <MediaControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'vacuum': return <VacuumControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'door-lock': return <LockControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'sensor': return <SensorControl data={state.data} />;
    case 'generic': return <GenericControl id={marker.id} data={state.data} update={updateDeviceState} />;
    default: return null;
  }
}

function LightControl({ id, data, update }: { id: string; data: LightState; update: UpdateFn }) {
  const pct = Math.round((data.brightness / 255) * 100);
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sun size={14} /><span>Ljusstyrka {pct}%</span></div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
      </div>
      <Slider value={[data.brightness]} max={255} step={1} onValueChange={([v]) => update(id, { brightness: v })} disabled={!data.on} />
      <div className="flex gap-1">
        {(['temp', 'rgb', 'off'] as const).map((mode) => (
          <Button key={mode} size="sm" variant={data.colorMode === mode ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
            onClick={() => update(id, { colorMode: mode })} disabled={!data.on}>
            {mode === 'temp' ? 'Temp' : mode === 'rgb' ? 'RGB' : 'Av'}
          </Button>
        ))}
      </div>
      {data.on && data.colorMode === 'temp' && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Färgtemperatur</p>
          <div className="h-3 rounded-full" style={{ background: 'linear-gradient(to right, #ff8a2b, #fff5e6, #a8c8ff)' }} />
          <Slider value={[data.colorTemp ?? 300]} min={153} max={500} step={1} onValueChange={([v]) => update(id, { colorTemp: v })} />
        </div>
      )}
      {data.on && data.colorMode === 'rgb' && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Färg</p>
          <div className="h-6 rounded-full" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />
          <div className="flex gap-1">
            {(['R', 'G', 'B'] as const).map((ch, i) => (
              <div key={ch} className="flex-1">
                <p className="text-[9px] text-muted-foreground text-center">{ch}</p>
                <Slider value={[data.rgbColor?.[i] ?? 255]} max={255} step={1}
                  onValueChange={([v]) => { const rgb = [...(data.rgbColor ?? [255, 255, 255])] as [number, number, number]; rgb[i] = v; update(id, { rgbColor: rgb }); }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClimateControl({ id, data, update }: { id: string; data: ClimateState; update: UpdateFn }) {
  const modes = [
    { key: 'heat', label: 'Värme', icon: Flame },
    { key: 'cool', label: 'Kyla', icon: Snowflake },
    { key: 'auto', label: 'Auto', icon: RotateCcw },
    { key: 'off', label: 'Av', icon: Square },
  ] as const;
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Nuvarande: {data.currentTemp}°C</span>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { targetTemp: data.targetTemp - 0.5 })}>−</Button>
        <span className="text-2xl font-bold text-foreground">{data.targetTemp}°</span>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { targetTemp: data.targetTemp + 0.5 })}>+</Button>
      </div>
      <div className="flex gap-1">
        {modes.map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={data.mode === key ? 'default' : 'outline'} className="flex-1 h-7 text-[10px] gap-1"
            onClick={() => update(id, { mode: key, on: key !== 'off' })}>
            <Icon size={12} />{label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function MediaControl({ id, data, update }: { id: string; data: MediaState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground capitalize">{data.state}</span>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v, state: v ? 'idle' : 'off' })} />
      </div>
      {data.title && (
        <div>
          <p className="text-sm font-medium text-foreground truncate">{data.title}</p>
          {data.artist && <p className="text-[10px] text-muted-foreground">{data.artist}</p>}
          {data.source && <p className="text-[10px] text-primary/70">{data.source}</p>}
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { state: data.state === 'playing' ? 'paused' : 'playing' })}>
          {data.state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { state: 'idle', progress: 0 })}><Square size={14} /></Button>
      </div>
      {data.progress !== undefined && data.progress > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${data.progress * 100}%` }} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Volume2 size={14} className="text-muted-foreground" />
        <Slider value={[data.volume]} max={1} step={0.01} onValueChange={([v]) => update(id, { volume: v })} className="flex-1" disabled={!data.on} />
        <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(data.volume * 100)}%</span>
      </div>
    </div>
  );
}

function VacuumControl({ id, data, update }: { id: string; data: VacuumState; update: UpdateFn }) {
  const labels: Record<string, string> = { cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder', error: 'Fel' };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{labels[data.status] ?? data.status}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Battery size={14} /><span>{data.battery}%</span></div>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant={data.status === 'cleaning' ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { on: true, status: 'cleaning' })}>Starta</Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { on: false, status: 'docked' })}>Stoppa</Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { status: 'returning' })}><HomeIcon size={12} /></Button>
      </div>
    </div>
  );
}

function LockControl({ id, data, update }: { id: string; data: LockState; update: UpdateFn }) {
  return (
    <div className="flex items-center justify-center py-3">
      <Button size="lg" variant={data.locked ? 'default' : 'destructive'} className="h-14 w-14 rounded-full p-0"
        onClick={() => update(id, { locked: !data.locked })}>
        {data.locked ? <Lock size={24} /> : <Unlock size={24} />}
      </Button>
      <span className="ml-3 text-sm font-medium text-foreground">{data.locked ? 'Låst' : 'Olåst'}</span>
    </div>
  );
}

function SensorControl({ data }: { data: SensorState }) {
  const isMotion = data.sensorType === 'motion';
  const detected = isMotion && data.value > 0;

  if (isMotion) {
    return (
      <div className="flex items-center justify-center py-3 gap-2">
        <Eye size={20} className={detected ? 'text-amber-400' : 'text-muted-foreground'} />
        <div>
          <span className={cn('text-sm font-semibold', detected ? 'text-amber-400' : 'text-foreground')}>
            {detected ? 'Rörelse detekterad' : 'Lugnt'}
          </span>
          {data.lastMotion && (
            <p className="text-[10px] text-muted-foreground">
              Senast: {new Date(data.lastMotion).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-3">
      <Thermometer size={20} className="text-muted-foreground mr-2" />
      <span className="text-2xl font-bold text-foreground">{data.value}</span>
      <span className="text-sm text-muted-foreground ml-1">{data.unit}</span>
    </div>
  );
}

function GenericControl({ id, data, update }: { id: string; data: GenericDeviceState; update: UpdateFn }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-muted-foreground">{data.on ? 'På' : 'Av'}</span>
      <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
    </div>
  );
}
