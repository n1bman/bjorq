import { useAppStore } from '@/store/useAppStore';
import type { DeviceMarker, LightState, ClimateState, MediaState, VacuumState, LockState, SensorState, GenericDeviceState, CameraState } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Sun, Thermometer, Play, Pause, Square, Volume2,
  Lock, Unlock, Battery, Home as HomeIcon,
  Snowflake, Flame, RotateCcw, Eye, Camera, Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { marker: DeviceMarker; compact?: boolean }
type UpdateFn = (id: string, partial: Record<string, unknown>) => void;

export default function DeviceControlCard({ marker, compact }: Props) {
  const state = useAppStore((s) => s.devices.deviceStates[marker.id]);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  if (!state) return null;

  if (compact) {
    return <CompactDeviceView marker={marker} state={state} />;
  }

  switch (state.kind) {
    case 'light': return <LightControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'climate': return <ClimateControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'media_screen': return <MediaControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'vacuum': return <VacuumControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'door-lock': return <LockControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'sensor': return <SensorControl data={state.data} />;
    case 'camera': return <CameraControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'generic': return <GenericControl id={marker.id} data={state.data} update={updateDeviceState} />;
    default: return null;
  }
}

function CompactDeviceView({ marker, state }: { marker: DeviceMarker; state: import('@/store/types').DeviceState }) {
  const kindIcons: Record<string, React.ReactNode> = {
    light: <Sun size={14} />,
    climate: <Thermometer size={14} />,
    camera: <Camera size={14} />,
    vacuum: <HomeIcon size={14} />,
    sensor: <Eye size={14} />,
  };

  const isOn = 'on' in state.data ? (state.data as any).on : state.kind === 'door-lock' ? !(state.data as LockState).locked : true;
  const wc = marker.widgetConfig;

  // Camera compact: show mini preview
  if (state.kind === 'camera') {
    const camData = state.data as CameraState;
    return (
      <div className="space-y-1.5">
        {(wc?.showImage !== false) && (
          <div className={cn(
            'relative rounded-lg overflow-hidden aspect-video',
            camData.on ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-muted'
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Video size={20} className={cn('text-muted-foreground', camData.on && 'text-primary/60')} />
            </div>
            {camData.on && (
              <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-red-500/80 rounded px-1 py-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                <span className="text-[8px] text-white font-bold">LIVE</span>
              </div>
            )}
          </div>
        )}
        {(wc?.showLabel !== false) && (
          <p className="text-[10px] text-muted-foreground truncate">{wc?.customLabel || marker.name || 'Kamera'}</p>
        )}
      </div>
    );
  }

  // Build status text per type
  let statusText = '';
  if (wc?.showValue !== false) {
    if (state.kind === 'light') {
      const pct = Math.round(((state.data as LightState).brightness / 255) * 100);
      statusText = isOn ? `${pct}%` : 'Av';
    } else if (state.kind === 'climate') {
      statusText = `${(state.data as ClimateState).targetTemp}°`;
    } else if (state.kind === 'media_screen') {
      const md = state.data as MediaState;
      statusText = md.title || (md.on ? md.state : 'Av');
    } else if (state.kind === 'sensor') {
      const sd = state.data as SensorState;
      statusText = `${sd.value} ${sd.unit}`;
    } else if (state.kind === 'vacuum') {
      const vd = state.data as VacuumState;
      const labels: Record<string, string> = { cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder' };
      statusText = labels[vd.status] ?? vd.status;
    }
  }

  return (
    <div className={cn('flex items-center gap-2', !isOn && 'opacity-50')}>
      <span className="text-primary">{kindIcons[marker.kind] || <Sun size={14} />}</span>
      <div className="flex-1 min-w-0">
        {(wc?.showLabel !== false) && (
          <span className="text-xs text-foreground truncate block">{wc?.customLabel || marker.name || marker.kind}</span>
        )}
        {statusText && <span className="text-[10px] text-muted-foreground truncate block">{statusText}</span>}
      </div>
      <span className={cn('w-2 h-2 rounded-full shrink-0', isOn ? 'bg-green-400' : 'bg-muted-foreground/30')} />
    </div>
  );
}

function CameraControl({ id, data, update }: { id: string; data: CameraState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Camera size={14} />
          <span>{data.streaming ? 'Strömmar' : 'Standby'}</span>
        </div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
      </div>
      {/* Camera preview placeholder */}
      <div className={cn(
        'relative rounded-lg overflow-hidden aspect-video',
        data.on ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-muted'
      )}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Video size={32} className={cn('text-muted-foreground', data.on && 'text-primary/60')} />
        </div>
        {data.on && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500/80 rounded px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] text-white font-bold">LIVE</span>
          </div>
        )}
      </div>
      {data.on && (
        <Button
          size="sm"
          variant={data.streaming ? 'default' : 'outline'}
          className="w-full h-7 text-[10px]"
          onClick={() => update(id, { streaming: !data.streaming })}
        >
          {data.streaming ? 'Stoppa ström' : 'Starta ström'}
        </Button>
      )}
    </div>
  );
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
