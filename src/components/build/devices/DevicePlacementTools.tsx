import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, BuildTool, DeviceMarker } from '@/store/types';
import { Lightbulb, ToggleLeft, Activity, Thermometer, Trash2, Camera, Bot, CookingPot, WashingMachine, DoorOpen, Lock, Plug, Refrigerator, Monitor, ChevronDown, ChevronRight, Link2, Fan, PanelTop, Clapperboard, ShieldAlert, Droplets, Flame, Bell, Grip, Wifi, Trees, Speaker, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { domainToKind } from '@/lib/haDomainMapping';
import VacuumMappingTools from './VacuumMappingTools';

const deviceTools: { key: BuildTool; kind: DeviceKind; label: string; icon: typeof Lightbulb; color: string }[] = [
  { key: 'place-light', kind: 'light', label: 'Ljus', icon: Lightbulb, color: 'text-yellow-400' },
  { key: 'place-switch', kind: 'switch', label: 'Knapp', icon: ToggleLeft, color: 'text-blue-400' },
  { key: 'place-sensor', kind: 'sensor', label: 'Sensor', icon: Activity, color: 'text-green-400' },
  { key: 'place-climate', kind: 'climate', label: 'Klimat', icon: Thermometer, color: 'text-cyan-400' },
  { key: 'place-camera', kind: 'camera', label: 'Kamera', icon: Camera, color: 'text-red-400' },
  { key: 'place-vacuum', kind: 'vacuum', label: 'Dammsugare', icon: Bot, color: 'text-purple-400' },
  { key: 'place-fridge', kind: 'fridge', label: 'Kylskåp', icon: Refrigerator, color: 'text-slate-300' },
  { key: 'place-oven', kind: 'oven', label: 'Ugn', icon: CookingPot, color: 'text-orange-400' },
  { key: 'place-washer', kind: 'washer', label: 'Tvättmaskin', icon: WashingMachine, color: 'text-sky-300' },
  { key: 'place-garage-door', kind: 'garage-door', label: 'Garageport', icon: DoorOpen, color: 'text-amber-500' },
  { key: 'place-door-lock', kind: 'door-lock', label: 'Dörrlås', icon: Lock, color: 'text-amber-400' },
  { key: 'place-power-outlet', kind: 'power-outlet', label: 'Eluttag', icon: Plug, color: 'text-yellow-300' },
  { key: 'place-media-screen', kind: 'media_screen', label: 'Skärm', icon: Monitor, color: 'text-indigo-400' },
  { key: 'place-fan', kind: 'fan', label: 'Fläkt', icon: Fan, color: 'text-cyan-400' },
  { key: 'place-cover', kind: 'cover', label: 'Persienn/Port', icon: PanelTop, color: 'text-stone-400' },
  { key: 'place-scene', kind: 'scene', label: 'Scen', icon: Clapperboard, color: 'text-violet-400' },
  { key: 'place-alarm', kind: 'alarm', label: 'Larm', icon: ShieldAlert, color: 'text-red-500' },
  { key: 'place-water-heater', kind: 'water-heater', label: 'Varmvatten', icon: Flame, color: 'text-orange-500' },
  { key: 'place-humidifier', kind: 'humidifier', label: 'Luftfuktare', icon: Droplets, color: 'text-teal-400' },
  { key: 'place-siren', kind: 'siren', label: 'Siren', icon: Bell, color: 'text-red-400' },
  { key: 'place-valve', kind: 'valve', label: 'Ventil', icon: Grip, color: 'text-blue-500' },
  { key: 'place-remote', kind: 'remote', label: 'Fjärr', icon: Wifi, color: 'text-gray-400' },
  { key: 'place-lawn-mower', kind: 'lawn-mower', label: 'Gräsklippare', icon: Trees, color: 'text-green-500' },
  { key: 'place-speaker', kind: 'speaker', label: 'Högtalare', icon: Speaker, color: 'text-emerald-400' },
  { key: 'place-soundbar', kind: 'soundbar', label: 'Soundbar', icon: Music, color: 'text-pink-400' },
];

const kindLabels: Record<DeviceKind, string> = {
  light: '💡 Ljus',
  switch: '🔌 Knapp',
  sensor: '🌡️ Sensor',
  climate: '❄️ Klimat',
  vacuum: '🤖 Dammsugare',
  camera: '📷 Kamera',
  fridge: '🧊 Kylskåp',
  oven: '🍳 Ugn',
  washer: '🫧 Tvättmaskin',
  'garage-door': '🚗 Garageport',
  'door-lock': '🔒 Dörrlås',
  'power-outlet': '🔌 Eluttag',
  media_screen: '📺 Skärm',
  fan: '🌀 Fläkt',
  cover: '🪟 Persienn',
  scene: '🎬 Scen',
  alarm: '🚨 Larm',
  'water-heater': '🔥 Varmvatten',
  humidifier: '💧 Luftfuktare',
  siren: '🔔 Siren',
  valve: '🔧 Ventil',
  remote: '📡 Fjärr',
  'lawn-mower': '🌿 Gräsklippare',
  speaker: '🔊 Högtalare',
  soundbar: '🎵 Soundbar',
};

export default function DevicePlacementTools() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const markers = useAppStore((s) => s.devices.markers);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const removeDevice = useAppStore((s) => s.removeDevice);
  const setSelection = useAppStore((s) => s.setSelection);
  const selectedId = useAppStore((s) => s.build.selection.type === 'device' ? s.build.selection.id : null);

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
              <div key={m.id} onClick={() => setSelection({ type: 'device', id: m.id })} className={cn(
                "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer",
                selectedId === m.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary/20"
              )}>
                <span className="hidden lg:inline truncate">{m.name || kindLabels[m.kind]}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDevice(m.id); }}
                  className="text-destructive/60 hover:text-destructive p-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <VacuumMappingTools />
      <UnlinkedHAEntities />
    </div>
  );
}

const generateId = () => Math.random().toString(36).slice(2, 10);

function UnlinkedHAEntities() {
  const [expanded, setExpanded] = useState(false);
  const status = useAppStore((s) => s.homeAssistant.status);
  const entities = useAppStore((s) => s.homeAssistant.entities);
  const markers = useAppStore((s) => s.devices.markers);
  const addDevice = useAppStore((s) => s.addDevice);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const setBuildTool = useAppStore((s) => s.setBuildTool);

  const linkedEntityIds = useMemo(
    () => new Set(markers.filter((m) => m.ha?.entityId).map((m) => m.ha!.entityId)),
    [markers]
  );

  const unlinked = useMemo(
    () => entities.filter((e) => !linkedEntityIds.has(e.entityId)),
    [entities, linkedEntityIds]
  );

  // Group by domain
  const grouped = useMemo(() => {
    const map = new Map<string, typeof unlinked>();
    for (const e of unlinked) {
      const list = map.get(e.domain) || [];
      list.push(e);
      map.set(e.domain, list);
    }
    return map;
  }, [unlinked]);

  if (status !== 'connected' || entities.length === 0) return null;

  const handlePlace = (entity: typeof entities[0]) => {
    const kind = domainToKind(entity.domain);
    if (!kind || !activeFloorId) return;
    const marker: DeviceMarker = {
      id: generateId(),
      kind,
      name: entity.friendlyName,
      floorId: activeFloorId,
      surface: 'floor',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      ha: { entityId: entity.entityId },
    };
    addDevice(marker);
    // Switch to the matching placement tool so user can reposition
    const toolMap: Partial<Record<DeviceKind, BuildTool>> = {
      light: 'place-light',
      switch: 'place-switch',
      sensor: 'place-sensor',
      climate: 'place-climate',
      camera: 'place-camera',
      vacuum: 'place-vacuum',
      'door-lock': 'place-door-lock',
      media_screen: 'place-media-screen',
      fan: 'place-fan',
      cover: 'place-cover',
      scene: 'place-scene',
      alarm: 'place-alarm',
      'water-heater': 'place-water-heater',
      humidifier: 'place-humidifier',
      siren: 'place-siren',
      valve: 'place-valve',
      remote: 'place-remote',
      'lawn-mower': 'place-lawn-mower',
      speaker: 'place-speaker',
      soundbar: 'place-soundbar',
    };
    if (toolMap[kind]) setBuildTool('select');
  };

  return (
    <div className="border-t border-border mt-2 pt-2 px-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Link2 size={10} />
        <span className="hidden lg:inline">HA-entiteter</span>
        <span className="ml-auto text-[9px]">
          {linkedEntityIds.size}/{entities.length}
        </span>
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-col gap-1 max-h-[35vh] overflow-y-auto">
          {unlinked.length === 0 ? (
            <p className="text-[9px] text-muted-foreground py-2 text-center">Alla entiteter är kopplade ✓</p>
          ) : (
            Array.from(grouped.entries()).map(([domain, items]) => (
              <div key={domain}>
                <p className="text-[9px] font-semibold text-muted-foreground mt-1 mb-0.5">{domain}</p>
                {items.map((entity) => {
                  const kind = domainToKind(entity.domain);
                  return (
                    <button
                      key={entity.entityId}
                      onClick={() => handlePlace(entity)}
                      disabled={!kind}
                      title={kind ? `Placera som ${kind}` : 'Kan ej mappas till enhetstyp'}
                      className={cn(
                        'w-full flex items-start gap-1.5 px-1.5 py-1 rounded text-[10px] text-left transition-colors',
                        kind
                          ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 cursor-pointer'
                          : 'text-muted-foreground/40 cursor-not-allowed'
                      )}
                    >
                      <span className="truncate flex-1">{entity.friendlyName}</span>
                      <span className="text-[8px] text-muted-foreground/60 shrink-0">{entity.state}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
