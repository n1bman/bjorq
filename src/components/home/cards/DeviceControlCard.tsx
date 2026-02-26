import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import type { DeviceMarker, LightState, ClimateState, MediaState, VacuumState, LockState, SensorState, GenericDeviceState, CameraState, FanState, CoverState, SceneState, AlarmState, WaterHeaterState, HumidifierState, ValveState, LawnMowerState, SpeakerState } from '@/store/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Sun, Thermometer, Play, Pause, Square, Volume2,
  Lock, Unlock, Battery, Home as HomeIcon,
  Snowflake, Flame, RotateCcw, Eye, Camera, Video,
  Fan, PanelTop, Clapperboard, ArrowUp, ArrowDown, StopCircle,
  SkipBack, SkipForward, Tv, MapPin, Wind, Ruler, Clock, AlertTriangle,
  ShieldAlert, Droplets, Bell, Grip, Trees, Speaker, Music, Info,
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
    case 'fan': return <FanControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'cover': return <CoverControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'scene': return <SceneControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'alarm': return <AlarmControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'water-heater': return <WaterHeaterControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'humidifier': return <HumidifierControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'siren': return <SirenControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'valve': return <ValveControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'lawn-mower': return <LawnMowerControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'speaker': return <SpeakerControl id={marker.id} data={state.data} update={updateDeviceState} />;
    case 'soundbar': return <SpeakerControl id={marker.id} data={state.data} update={updateDeviceState} />;
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
    fan: <Fan size={14} />,
    cover: <PanelTop size={14} />,
    scene: <Clapperboard size={14} />,
    alarm: <ShieldAlert size={14} />,
    'water-heater': <Flame size={14} />,
    humidifier: <Droplets size={14} />,
    siren: <Bell size={14} />,
    valve: <Grip size={14} />,
    'lawn-mower': <Trees size={14} />,
    speaker: <Speaker size={14} />,
    soundbar: <Music size={14} />,
  };

  const isOn = 'on' in state.data ? (state.data as any).on : state.kind === 'door-lock' ? !(state.data as LockState).locked : state.kind === 'cover' ? (state.data as CoverState).position > 0 : state.kind !== 'scene';
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

  // Media screen compact: show inline controls when on
  if (state.kind === 'media_screen') {
    const md = state.data as MediaState;
    const updateDeviceState = useAppStore.getState().updateDeviceState;
    return <CompactMediaControl id={marker.id} data={md} update={updateDeviceState} label={wc?.customLabel || marker.name || 'TV'} />;
  }

  // Speaker/soundbar compact: show play/pause + volume
  if (state.kind === 'speaker' || state.kind === 'soundbar') {
    const sd = state.data as import('@/store/types').SpeakerState;
    const updateDeviceState = useAppStore.getState().updateDeviceState;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Speaker size={14} className="text-primary shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">{wc?.customLabel || marker.name || (state.kind === 'speaker' ? 'Högtalare' : 'Soundbar')}</span>
          <span className={cn('w-2 h-2 rounded-full shrink-0', sd.on ? 'bg-green-400' : 'bg-muted-foreground/30')} />
        </div>
        {sd.mediaTitle && <p className="text-[10px] text-muted-foreground truncate">{sd.mediaTitle}</p>}
        {sd.isSpeaking && <p className="text-[10px] text-blue-400">🗣️ Pratar...</p>}
        {sd.on && (
          <div className="flex items-center justify-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); updateDeviceState(marker.id, { state: sd.state === 'playing' ? 'paused' : 'playing' }); }}>
              {sd.state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); updateDeviceState(marker.id, { state: 'idle' }); }}>
              <Square size={10} />
            </Button>
            <div className="flex items-center gap-1 ml-1">
              <Volume2 size={10} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{Math.round(sd.volume * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vacuum compact: show status + inline controls + room picker
  if (state.kind === 'vacuum') {
    const vd = state.data as VacuumState;
    const updateDeviceState = useAppStore.getState().updateDeviceState;
    const vacLabels: Record<string, string> = { cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder', paused: 'Pausad', idle: 'Väntar', error: 'Fel' };
    return <CompactVacuumControl marker={marker} data={vd} update={updateDeviceState} labels={vacLabels} label={wc?.customLabel} />;
  }

  // Build status text per type
  let statusText = '';
  if (wc?.showValue !== false) {
    if (state.kind === 'light') {
      const pct = Math.round(((state.data as LightState).brightness / 255) * 100);
      statusText = isOn ? `${pct}%` : 'Av';
    } else if (state.kind === 'climate') {
      statusText = `${(state.data as ClimateState).targetTemp}°`;
    } else if (state.kind === 'sensor') {
      const sd = state.data as SensorState;
      statusText = `${sd.value} ${sd.unit}`;
    } else if (state.kind === 'fan') {
      const fd = state.data as FanState;
      statusText = fd.on ? `${fd.speed}%` : 'Av';
    } else if (state.kind === 'cover') {
      const cd = state.data as CoverState;
      statusText = `${cd.position}%`;
    } else if (state.kind === 'scene') {
      statusText = 'Scen';
    } else if (state.kind === 'alarm') {
      const labels: Record<string, string> = { disarmed: 'Avlarmat', armed_home: 'Hemma', armed_away: 'Borta', triggered: 'Utlöst' };
      statusText = labels[(state.data as AlarmState).state] ?? (state.data as AlarmState).state;
    } else if (state.kind === 'humidifier') {
      const hd = state.data as HumidifierState;
      statusText = hd.on ? `${hd.humidity}%` : 'Av';
    } else if (state.kind === 'water-heater') {
      statusText = `${(state.data as WaterHeaterState).temperature}°`;
    } else if (state.kind === 'valve') {
      statusText = (state.data as ValveState).state === 'open' ? 'Öppen' : 'Stängd';
    } else if (state.kind === 'lawn-mower') {
      const labels: Record<string, string> = { mowing: 'Klipper', docked: 'Dockad', returning: 'Återvänder' };
      statusText = labels[(state.data as LawnMowerState).status] ?? (state.data as LawnMowerState).status;
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

function CompactMediaControl({ id, data, update, label }: { id: string; data: MediaState; update: (id: string, partial: Record<string, unknown>) => void; label: string }) {
  const isPlaying = data.state === 'playing';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Tv size={14} className="text-primary shrink-0" />
        <span className="text-xs text-foreground truncate flex-1">{label}</span>
        <span className={cn('w-2 h-2 rounded-full shrink-0', data.on ? 'bg-green-400' : 'bg-muted-foreground/30')} />
      </div>
      {data.title && <p className="text-[10px] text-muted-foreground truncate">{data.title}</p>}
      {data.on && (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); update(id, { _action: 'previous' }); }}>
            <SkipBack size={12} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); update(id, { state: isPlaying ? 'paused' : 'playing' }); }}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); update(id, { _action: 'next' }); }}>
            <SkipForward size={12} />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); update(id, { _action: 'stop' }); }}>
            <Square size={10} />
          </Button>
        </div>
      )}
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
  const labels: Record<string, string> = { cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder', paused: 'Pausad', idle: 'Väntar', error: 'Fel' };
  const statusColors: Record<string, string> = { cleaning: 'text-blue-400', docked: 'text-green-400', returning: 'text-orange-400', paused: 'text-yellow-400', error: 'text-destructive' };
  const presets = data.fanSpeedList ?? ['Silent', 'Standard', 'Turbo', 'Max'];
  const presetSpeeds: Record<string, number> = {};
  presets.forEach((p, i) => { presetSpeeds[p.toLowerCase()] = Math.round(((i + 1) / presets.length) * 100); });

  // Get zones for room-specific cleaning
  const marker = useAppStore((s) => s.devices.markers.find(m => m.id === id));
  const floors = useAppStore((s) => s.layout.floors);
  const floor = marker ? floors.find(f => f.id === marker.floorId) : null;
  const zones = floor?.vacuumMapping?.zones ?? [];
  const rooms = floor?.rooms ?? [];

  const getZoneName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId || r.name === roomId);
    return room?.name ?? roomId;
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Roborock notice */}
      <div className="flex items-start gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1">
        <Info size={10} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[9px] text-orange-300/80">Rumsstyrning: bara Roborock</p>
      </div>

      {/* Status + battery */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <span className={cn('text-sm font-medium', statusColors[data.status] ?? 'text-foreground')}>
              {data.targetRoom && data.status === 'cleaning'
                ? `${labels[data.status] ?? data.status} · ${data.targetRoom}`
                : labels[data.status] ?? data.status}
            </span>
            {data.currentRoom && data.status === 'cleaning' && !data.targetRoom && (
              <span className="text-xs text-muted-foreground ml-1">· {data.currentRoom}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Battery size={14} /><span>{data.battery}%</span></div>
      </div>

      {/* Current room indicator */}
      {data.currentRoom && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-1.5">
          <MapPin size={14} className="text-primary" />
          <span className="text-xs text-foreground">
            {data.status === 'cleaning' ? 'Städar i' : 'Plats'}:{' '}
            <strong>{data.currentRoom}</strong>
          </span>
        </div>
      )}

      {data.status === 'error' && data.errorMessage && (
        <div className="flex items-center gap-2 bg-destructive/10 rounded p-1.5">
          <AlertTriangle size={12} className="text-destructive" />
          <span className="text-[10px] text-destructive">{data.errorMessage}</span>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-1">
        <Button size="sm" variant={data.status === 'cleaning' ? 'default' : 'outline'} className="flex-1 h-8 text-[10px] gap-1"
          onClick={() => update(id, { on: true, status: 'cleaning', targetRoom: undefined })}><Play size={12} /> Städa allt</Button>
        <Button size="sm" variant={data.status === 'paused' ? 'default' : 'outline'} className="flex-1 h-8 text-[10px] gap-1"
          onClick={() => update(id, { status: 'paused' })}><Pause size={12} /> Pausa</Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-[10px] gap-1"
          onClick={() => update(id, { on: false, status: 'docked', targetRoom: undefined })}><Square size={12} /> Stopp</Button>
        <Button size="sm" variant="outline" className="h-8 text-[10px] gap-1"
          onClick={() => update(id, { status: 'returning', targetRoom: undefined })}><HomeIcon size={12} /> Hem</Button>
      </div>

      {/* Room-specific cleaning */}
      {zones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Städa rum</p>
          <div className="flex gap-1 flex-wrap">
            {zones.map((zone) => {
              const name = getZoneName(zone.roomId);
              const isActive = data.status === 'cleaning' && data.currentRoom?.toLowerCase() === name.toLowerCase();
              return (
                <Button key={zone.roomId} size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className="h-7 text-[10px] gap-1"
                  onClick={() => update(id, { on: true, status: 'cleaning', currentRoom: name, targetRoom: name })}>
                  <MapPin size={10} /> {name}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Locate */}
      <Button size="sm" variant="ghost" className="w-full h-7 text-[10px] gap-1"
        onClick={() => update(id, { _action: 'locate' })}>
        <MapPin size={12} /> Lokalisera (pip)
      </Button>

      {/* Fan speed */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Wind size={12} />
          <span>Sugeffekt {data.fanSpeedPreset ? `${data.fanSpeedPreset} (${data.fanSpeed ?? 0}%)` : `${data.fanSpeed ?? 0}%`}</span>
        </div>
        <Slider value={[data.fanSpeed ?? 50]} max={100} step={5} onValueChange={([v]) => update(id, { fanSpeed: v })} />
        <div className="flex gap-1">
          {presets.map((p) => {
            const speed = presetSpeeds[p.toLowerCase()] ?? 50;
            const active = data.fanSpeedPreset
              ? data.fanSpeedPreset.toLowerCase() === p.toLowerCase()
              : Math.abs((data.fanSpeed ?? 0) - speed) < 10;
            return (
              <Button key={p} size="sm" variant={active ? 'default' : 'outline'}
                className="flex-1 h-6 text-[9px]"
                onClick={() => update(id, { fanSpeed: speed, fanSpeedPreset: p })}>{p}</Button>
            );
          })}
        </div>
      </div>
      {/* Stats */}
      {(data.cleaningArea !== undefined || data.cleaningTime !== undefined) && (
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          {data.cleaningArea !== undefined && <span className="flex items-center gap-1"><Ruler size={10} />{data.cleaningArea} m²</span>}
          {data.cleaningTime !== undefined && <span className="flex items-center gap-1"><Clock size={10} />{data.cleaningTime} min</span>}
        </div>
      )}
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

function FanControl({ id, data, update }: { id: string; data: FanState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Fan size={14} />
          <span>Hastighet {data.speed}%</span>
        </div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v, speed: v ? (data.speed || 50) : 0 })} />
      </div>
      <Slider value={[data.speed]} max={100} step={1} onValueChange={([v]) => update(id, { speed: v, on: v > 0 })} disabled={!data.on} />
      <div className="flex gap-1">
        {(['low', 'medium', 'high'] as const).map((preset) => (
          <Button key={preset} size="sm" variant={data.preset === preset ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
            onClick={() => {
              const speeds = { low: 25, medium: 50, high: 100 };
              update(id, { preset, speed: speeds[preset], on: true });
            }} disabled={!data.on}>
            {preset === 'low' ? 'Låg' : preset === 'medium' ? 'Med' : 'Hög'}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CoverControl({ id, data, update }: { id: string; data: CoverState; update: UpdateFn }) {
  const stateLabels: Record<string, string> = { open: 'Öppen', closed: 'Stängd', opening: 'Öppnar', closing: 'Stänger', stopped: 'Stoppad' };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{stateLabels[data.state] ?? data.state}</span>
        <span className="text-xs font-medium text-foreground">{data.position}%</span>
      </div>
      <Slider value={[data.position]} max={100} step={1} onValueChange={([v]) => update(id, { position: v, state: v === 0 ? 'closed' : v === 100 ? 'open' : 'stopped' })} />
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => update(id, { position: 100, state: 'open' })}>
          <ArrowUp size={12} /> Öppna
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => update(id, { state: 'stopped' })}>
          <StopCircle size={12} /> Stopp
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => update(id, { position: 0, state: 'closed' })}>
          <ArrowDown size={12} /> Stäng
        </Button>
      </div>
    </div>
  );
}

function SceneControl({ id, data, update }: { id: string; data: SceneState; update: UpdateFn }) {
  return (
    <div className="space-y-2 pt-2">
      <Button size="sm" className="w-full h-9 text-xs gap-2"
        onClick={() => update(id, { lastTriggered: new Date().toISOString() })}>
        <Clapperboard size={14} /> Kör scen
      </Button>
      {data.lastTriggered && (
        <p className="text-[10px] text-muted-foreground text-center">
          Senast: {new Date(data.lastTriggered).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}

function AlarmControl({ id, data, update }: { id: string; data: AlarmState; update: UpdateFn }) {
  const labels: Record<string, string> = { disarmed: 'Avlarmat', armed_home: 'Hemma', armed_away: 'Borta', armed_night: 'Natt', pending: 'Väntar', triggered: 'Utlöst!' };
  const modes = [
    { key: 'disarmed', label: 'Avlarma' },
    { key: 'armed_home', label: 'Hemma' },
    { key: 'armed_away', label: 'Borta' },
    { key: 'armed_night', label: 'Natt' },
  ] as const;
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className={data.state === 'triggered' ? 'text-destructive animate-pulse' : 'text-primary'} />
          <span className="text-sm font-medium text-foreground">{labels[data.state] ?? data.state}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {modes.map(({ key, label }) => (
          <Button key={key} size="sm" variant={data.state === key ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
            onClick={() => update(id, { state: key })}>{label}</Button>
        ))}
      </div>
    </div>
  );
}

function WaterHeaterControl({ id, data, update }: { id: string; data: WaterHeaterState; update: UpdateFn }) {
  const modes = ['eco', 'electric', 'performance', 'off'] as const;
  const modeLabels: Record<string, string> = { eco: 'Eko', electric: 'El', performance: 'Max', off: 'Av' };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame size={14} /><span>{data.temperature}°C</span></div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v, mode: v ? 'electric' : 'off' })} />
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { temperature: data.temperature - 5 })}>−</Button>
        <span className="text-2xl font-bold text-foreground">{data.temperature}°</span>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { temperature: data.temperature + 5 })}>+</Button>
      </div>
      <div className="flex gap-1">
        {modes.map((m) => (
          <Button key={m} size="sm" variant={data.mode === m ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
            onClick={() => update(id, { mode: m, on: m !== 'off' })} disabled={!data.on && m !== 'off'}>{modeLabels[m]}</Button>
        ))}
      </div>
    </div>
  );
}

function HumidifierControl({ id, data, update }: { id: string; data: HumidifierState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets size={14} /><span>Målnivå {data.humidity}%</span></div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
      </div>
      <Slider value={[data.humidity]} min={20} max={90} step={5} onValueChange={([v]) => update(id, { humidity: v })} disabled={!data.on} />
      {data.availableModes && data.availableModes.length > 0 && (
        <div className="flex gap-1">
          {data.availableModes.map((m) => (
            <Button key={m} size="sm" variant={data.mode === m ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
              onClick={() => update(id, { mode: m })} disabled={!data.on}>{m}</Button>
          ))}
        </div>
      )}
    </div>
  );
}

function SirenControl({ id, data, update }: { id: string; data: import('@/store/types').SirenState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Bell size={14} /><span>{data.on ? 'Aktiv' : 'Av'}</span></div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v })} />
      </div>
      {data.availableTones && data.availableTones.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {data.availableTones.map((t) => (
            <Button key={t} size="sm" variant={data.tone === t ? 'default' : 'outline'} className="h-7 text-[10px]"
              onClick={() => update(id, { tone: t })} disabled={!data.on}>{t}</Button>
          ))}
        </div>
      )}
      {typeof data.volume === 'number' && (
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-muted-foreground" />
          <Slider value={[data.volume]} max={1} step={0.1} onValueChange={([v]) => update(id, { volume: v })} disabled={!data.on} className="flex-1" />
        </div>
      )}
    </div>
  );
}

function ValveControl({ id, data, update }: { id: string; data: ValveState; update: UpdateFn }) {
  const stateLabels: Record<string, string> = { open: 'Öppen', closed: 'Stängd', opening: 'Öppnar', closing: 'Stänger' };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Grip size={14} /><span>{stateLabels[data.state] ?? data.state}</span></div>
        <span className="text-xs font-medium text-foreground">{data.position}%</span>
      </div>
      <Slider value={[data.position]} max={100} step={1} onValueChange={([v]) => update(id, { position: v, state: v === 0 ? 'closed' : 'open' })} />
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => update(id, { position: 100, state: 'open' })}>
          <ArrowUp size={12} /> Öppna
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] gap-1"
          onClick={() => update(id, { position: 0, state: 'closed' })}>
          <ArrowDown size={12} /> Stäng
        </Button>
      </div>
    </div>
  );
}

function LawnMowerControl({ id, data, update }: { id: string; data: LawnMowerState; update: UpdateFn }) {
  const labels: Record<string, string> = { mowing: 'Klipper', docked: 'Dockad', returning: 'Återvänder', paused: 'Pausad', idle: 'Väntar', error: 'Fel' };
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{labels[data.status] ?? data.status}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Battery size={14} /><span>{data.battery}%</span></div>
      </div>
      {data.status === 'error' && data.errorMessage && (
        <div className="flex items-center gap-2 bg-destructive/10 rounded p-1.5">
          <AlertTriangle size={12} className="text-destructive" />
          <span className="text-[10px] text-destructive">{data.errorMessage}</span>
        </div>
      )}
      <div className="flex gap-1">
        <Button size="sm" variant={data.status === 'mowing' ? 'default' : 'outline'} className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { on: true, status: 'mowing' })}>Starta</Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { status: 'paused' })}>Pausa</Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]"
          onClick={() => update(id, { on: false, status: 'docked' })}>Docka</Button>
      </div>
    </div>
  );
}

function SpeakerControl({ id, data, update }: { id: string; data: SpeakerState; update: UpdateFn }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Speaker size={14} />
          <span className="capitalize">{data.state === 'playing' ? 'Spelar' : data.state === 'paused' ? 'Pausad' : 'Väntar'}</span>
          {data.isSpeaking && <span className="text-blue-400 text-[10px]">🗣️ Pratar</span>}
        </div>
        <Switch checked={data.on} onCheckedChange={(v) => update(id, { on: v, state: v ? 'idle' : 'idle' })} />
      </div>
      {data.mediaTitle && (
        <div>
          <p className="text-sm font-medium text-foreground truncate">{data.mediaTitle}</p>
          {data.source && <p className="text-[10px] text-primary/70">{data.source}</p>}
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { state: data.state === 'playing' ? 'paused' : 'playing' })}>
          {data.state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
        </Button>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={!data.on}
          onClick={() => update(id, { state: 'idle' })}><Square size={14} /></Button>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 size={14} className="text-muted-foreground" />
        <Slider value={[data.volume]} max={1} step={0.01} onValueChange={([v]) => update(id, { volume: v })} className="flex-1" disabled={!data.on} />
        <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(data.volume * 100)}%</span>
      </div>
    </div>
  );
}

function CompactVacuumControl({ marker, data: vd, update, labels: vacLabels, label }: {
  marker: DeviceMarker; data: VacuumState; update: (id: string, p: Record<string, unknown>) => void;
  labels: Record<string, string>; label?: string;
}) {
  const [showRooms, setShowRooms] = useState(false);
  const floors = useAppStore((s) => s.layout.floors);
  const floor = floors.find((f) => f.id === marker.floorId);
  const rooms = floor?.rooms ?? [];
  const zones = floor?.vacuumMapping?.zones ?? [];

  const getZoneName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId || r.name === roomId);
    return room?.name ?? roomId;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-primary">🤖</span>
        <span className="text-xs text-foreground truncate flex-1">{label || marker.name || 'Dammsugare'}</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Battery size={10} />
          <span>{vd.battery}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">{vacLabels[vd.status] ?? vd.status}</span>
        {vd.currentRoom && <span className="text-[9px] text-primary/70">· {vd.currentRoom}</span>}
      </div>
      <div className="flex items-center gap-0.5 flex-wrap">
        <Button size="sm" variant={vd.status === 'cleaning' ? 'default' : 'ghost'} className="h-6 px-1.5 text-[9px] gap-0.5"
          onClick={(e) => { e.stopPropagation(); update(marker.id, { on: true, status: 'cleaning' }); }}>
          <Play size={10} /> Städa
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] gap-0.5"
          onClick={(e) => { e.stopPropagation(); update(marker.id, { status: 'paused' }); }}>
          <Pause size={10} />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] gap-0.5"
          onClick={(e) => { e.stopPropagation(); update(marker.id, { on: false, status: 'docked' }); }}>
          <Square size={10} />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] gap-0.5"
          onClick={(e) => { e.stopPropagation(); update(marker.id, { status: 'returning' }); }}>
          <HomeIcon size={10} />
        </Button>
        {zones.length > 0 && (
          <Button size="sm" variant={showRooms ? 'default' : 'ghost'} className="h-6 px-1.5 text-[9px] gap-0.5"
            onClick={(e) => { e.stopPropagation(); setShowRooms(!showRooms); }}>
            <MapPin size={10} />
          </Button>
        )}
      </div>
      {showRooms && zones.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {zones.map((zone) => {
            const name = getZoneName(zone.roomId);
            const isActive = vd.status === 'cleaning' && vd.currentRoom?.toLowerCase() === name.toLowerCase();
            return (
              <Button key={zone.roomId} size="sm"
                variant={isActive ? 'default' : 'outline'}
                className="h-5 px-2 text-[8px]"
                onClick={(e) => {
                  e.stopPropagation();
                  update(marker.id, { on: true, status: 'cleaning', currentRoom: name, targetRoom: name });
                }}>
                {name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
