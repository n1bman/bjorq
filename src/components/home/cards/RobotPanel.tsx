import { useAppStore } from '../../../store/useAppStore';
import type { VacuumState, DeviceMarker, CleaningLogEntry } from '../../../store/types';
import { pointInPolygon } from '../../../lib/vacuumGeometry';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { Progress } from '../../ui/progress';
import {
  Battery, Play, Square, Home as HomeIcon, MapPin, AlertTriangle,
  Clock, Ruler, Wind, Pause, History, Info, AlertCircle, Bug,
  Bot, CheckSquare, Minus, Plus,
} from 'lucide-react';
import { toast } from '../../../hooks/use-toast';
import { cn } from '../../../lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '../../ui/checkbox';
import { getRobotEntityViews } from '../../../lib/haMenuSelectors';
import { haServiceCaller } from '../../../hooks/useHomeAssistant';
import { setFromHA } from '../../../hooks/useHABridge';
import { callHAService, isHostedSync } from '../../../lib/apiClient';

const statusLabels: Record<string, string> = {
  cleaning: 'Städar', docked: 'Dockad', returning: 'Återvänder',
  paused: 'Pausad', idle: 'Väntar', error: 'Fel',
};
const statusColors: Record<string, string> = {
  cleaning: 'text-blue-400', docked: 'text-green-400', returning: 'text-orange-400',
  paused: 'text-yellow-400', idle: 'text-muted-foreground', error: 'text-destructive',
};

const ZONE_COLORS = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-400' },
  { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', dot: 'bg-pink-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-400' },
];

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

function FanSpeedSelector({
  data,
  onChange,
}: {
  data: VacuumState;
  onChange: (presetName: string, speed: number) => void;
}) {
  const presets = data.fanSpeedList ?? ['Silent', 'Standard', 'Medium', 'Turbo', 'Max'];
  const presetSpeeds: Record<string, number> = {};
  presets.forEach((p, i) => { presetSpeeds[p.toLowerCase()] = Math.round(((i + 1) / presets.length) * 100); });

  const resolvePreset = (speed: number) => {
    const idx = Math.round((speed / 100) * (presets.length - 1));
    return presets[Math.max(0, Math.min(idx, presets.length - 1))];
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wind size={14} />
        <span>Sugeffekt {data.fanSpeedPreset ? `${data.fanSpeedPreset} (${data.fanSpeed ?? 0}%)` : `${data.fanSpeed ?? 0}%`}</span>
      </div>
      <Slider
        value={[data.fanSpeed ?? 50]}
        max={100}
        step={5}
        onValueChange={([v]) => {
          const preset = resolvePreset(v);
          onChange(preset, v);
        }}
      />
      <div className="flex gap-1 flex-wrap">
        {presets.map((p) => {
          const speed = presetSpeeds[p.toLowerCase()] ?? 50;
          const active = data.fanSpeedPreset
            ? data.fanSpeedPreset.toLowerCase() === p.toLowerCase()
            : Math.abs((data.fanSpeed ?? 0) - speed) < 10;
          return (
            <Button key={p} size="sm" variant={active ? 'default' : 'outline'}
              className="h-8 text-[10px] px-2.5"
              onClick={() => onChange(p, speed)}>
              {p}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Room zone cards for targeted cleaning */
/** Room zone cards for targeted cleaning — supports multi-room selection with repeat */
function RoomZoneCards({
  marker,
  data,
  onStartRoomCleaning,
  onStartMultiRoomCleaning,
}: {
  marker: DeviceMarker;
  data: VacuumState;
  onStartRoomCleaning: (roomName: string, segmentId: number, fanPreset?: string) => void;
  onStartMultiRoomCleaning: (rooms: { roomName: string; segmentId: number; repeat: number }[]) => void;
}) {
  const floors = useAppStore((s) => s.layout.floors);
  const floor = floors.find((f) => f.id === marker.floorId);
  const rooms = floor?.rooms ?? [];
  const mapping = floor?.vacuumMapping;
  const zones = mapping?.zones ?? [];
  const [multiMode, setMultiMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({}); // roomId → repeat count

  if (zones.length === 0) return null;

  const vacuumSegmentMap = useAppStore((s) => s.homeAssistant.vacuumSegmentMap);

  const getZoneName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId || r.name === roomId);
    return room?.name ?? roomId;
  };

  const getZoneSegmentId = (zone: typeof zones[number]) => {
    if (zone.segmentId) return zone.segmentId;
    const name = getZoneName(zone.roomId);
    return vacuumSegmentMap[name];
  };

  const startRoomCleaning = (roomName: string, zone: typeof zones[number]) => {
    const segId = getZoneSegmentId(zone);
    if (!segId) {
      toast({
        title: 'Segment-ID saknas',
        description: `Rummet "${roomName}" har inget segment-ID. Gå till Design → Inredning → Enheter och välj segment-ID.`,
        variant: 'destructive',
      });
      return;
    }
    onStartRoomCleaning(roomName, segId, (useAppStore.getState().devices.deviceStates[marker.id] as any)?.data?.fanSpeedPreset);
  };

  const toggleRoom = (roomId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[roomId]) {
        delete next[roomId];
      } else {
        next[roomId] = 1;
      }
      return next;
    });
  };

  const adjustRepeat = (roomId: string, delta: number) => {
    setSelected((prev) => {
      const current = prev[roomId] ?? 1;
      const next = Math.max(1, Math.min(3, current + delta));
      return { ...prev, [roomId]: next };
    });
  };

  const startMulti = () => {
    const items: { roomName: string; segmentId: number; repeat: number }[] = [];
    for (const zone of zones) {
      const repeat = selected[zone.roomId];
      if (!repeat) continue;
      const segId = getZoneSegmentId(zone);
      if (!segId) {
        toast({
          title: 'Segment-ID saknas',
          description: `Rummet "${getZoneName(zone.roomId)}" saknar segment-ID.`,
          variant: 'destructive',
        });
        return;
      }
      items.push({ roomName: getZoneName(zone.roomId), segmentId: segId, repeat });
    }
    if (items.length === 0) return;
    onStartMultiRoomCleaning(items);
    setSelected({});
    setMultiMode(false);
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Rum ({zones.length})
        </p>
        <Button size="sm" variant={multiMode ? 'default' : 'outline'} className="h-6 text-[9px] px-2 gap-1"
          onClick={() => { setMultiMode(!multiMode); setSelected({}); }}>
          <CheckSquare size={10} /> {multiMode ? 'Avbryt' : 'Välj flera'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {zones.map((zone, i) => {
          const name = getZoneName(zone.roomId);
          const zc = ZONE_COLORS[i % ZONE_COLORS.length];
          const isActive = data.status === 'cleaning' && data.currentRoom?.toLowerCase() === name.toLowerCase();
          const hasSegId = !!getZoneSegmentId(zone);
          const isSelected = !!selected[zone.roomId];
          const repeat = selected[zone.roomId] ?? 1;

          if (multiMode) {
            return (
              <div
                key={zone.roomId}
                className={cn(
                  'relative rounded-xl border p-3 transition-all',
                  isSelected
                    ? `${zc.bg} ${zc.border} ring-1 ring-primary/30`
                    : 'bg-secondary/30 border-border/50'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRoom(zone.roomId)}
                  />
                  <span className="text-xs font-medium text-foreground truncate">{name}</span>
                  {!hasSegId && <AlertCircle size={12} className="text-yellow-500 flex-shrink-0" />}
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => adjustRepeat(zone.roomId, -1)} className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Minus size={10} />
                    </button>
                    <span className="text-[10px] font-medium text-foreground min-w-[20px] text-center">{repeat}x</span>
                    <button onClick={() => adjustRepeat(zone.roomId, 1)} className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Plus size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={zone.roomId}
              onClick={() => startRoomCleaning(name, zone)}
              className={cn(
                'relative rounded-xl border p-3 text-left transition-all',
                isActive
                  ? `${zc.bg} ${zc.border} ring-1 ring-primary/30`
                  : `bg-secondary/30 border-border/50 hover:${zc.bg} hover:${zc.border}`
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('w-2 h-2 rounded-full', zc.dot)} />
                <span className="text-xs font-medium text-foreground truncate">{name}</span>
                {!hasSegId && (
                  <AlertCircle size={12} className="text-yellow-500 flex-shrink-0" />
                )}
              </div>
              {isActive ? (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-primary animate-pulse">Städar...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Play size={8} />
                  <span>{hasSegId ? 'Städa rum' : 'Saknar segment-ID'}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {multiMode && selectedCount > 0 && (
        <Button size="sm" className="w-full h-9 text-xs gap-1" onClick={startMulti}>
          <Play size={12} /> Städa {selectedCount} rum
        </Button>
      )}
    </div>
  );
}

/** Mini 2D map showing rooms and robot position */
function VacuumMiniMap({ marker, data }: { marker: DeviceMarker; data: VacuumState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floors = useAppStore((s) => s.layout.floors);
  const floor = floors.find((f) => f.id === marker.floorId);
  const rooms = floor?.rooms ?? [];
  const mapping = floor?.vacuumMapping;
  const animRef = useRef<number>(0);
  const displayRoom = data.currentRoom ?? (data.status === 'cleaning' ? data.targetRoom : undefined);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = 'hsl(220, 20%, 12%)';
      ctx.fillRect(0, 0, w, h);

      const zones = mapping?.zones ?? [];
      if (zones.length === 0 && rooms.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Inga rum definierade', w / 2, h / 2);
        return;
      }

      // Use zones for bounds if available, otherwise rooms
      const polys = zones.length > 0 ? zones.map(z => z.polygon) : rooms.filter(r => r.polygon).map(r => r.polygon!);
      
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const poly of polys) {
        for (const [x, z] of poly) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        }
      }
      if (!isFinite(minX)) return;

      const padding = 16;
      const rangeX = maxX - minX || 1;
      const rangeZ = maxZ - minZ || 1;
      const scale = Math.min((w - padding * 2) / rangeX, (h - padding * 2) / rangeZ);
      const offX = (w - rangeX * scale) / 2;
      const offZ = (h - rangeZ * scale) / 2;

      const toScreen = (x: number, z: number): [number, number] => [
        offX + (x - minX) * scale,
        offZ + (z - minZ) * scale,
      ];

      const mapZoneColors = [
        { fill: 'rgba(74, 158, 255, 0.15)', stroke: 'rgba(74, 158, 255, 0.5)', label: 'rgba(74, 158, 255, 0.8)' },
        { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.5)', label: 'rgba(168, 85, 247, 0.8)' },
        { fill: 'rgba(34, 197, 94, 0.15)', stroke: 'rgba(34, 197, 94, 0.5)', label: 'rgba(34, 197, 94, 0.8)' },
        { fill: 'rgba(251, 146, 60, 0.15)', stroke: 'rgba(251, 146, 60, 0.5)', label: 'rgba(251, 146, 60, 0.8)' },
        { fill: 'rgba(236, 72, 153, 0.15)', stroke: 'rgba(236, 72, 153, 0.5)', label: 'rgba(236, 72, 153, 0.8)' },
        { fill: 'rgba(34, 211, 238, 0.15)', stroke: 'rgba(34, 211, 238, 0.5)', label: 'rgba(34, 211, 238, 0.8)' },
      ];

      // Draw zones with distinct colors
      if (zones.length > 0) {
        zones.forEach((zone, zi) => {
          if (zone.polygon.length < 3) return;
          const zc = mapZoneColors[zi % mapZoneColors.length];
          const isActive = data.currentRoom && rooms.find(r => r.id === zone.roomId || r.name === zone.roomId)?.name?.toLowerCase() === data.currentRoom.toLowerCase();

          ctx.beginPath();
          const [sx, sy] = toScreen(zone.polygon[0][0], zone.polygon[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < zone.polygon.length; i++) {
            const [px, py] = toScreen(zone.polygon[i][0], zone.polygon[i][1]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = isActive ? zc.stroke.replace('0.5', '0.3') : zc.fill;
          ctx.fill();
          ctx.strokeStyle = zc.stroke;
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.stroke();

          // Label
          const roomObj = rooms.find(r => r.id === zone.roomId || r.name === zone.roomId);
          const label = roomObj?.name ?? zone.roomId;
          let cx = zone.polygon.reduce((a, p) => a + p[0], 0) / zone.polygon.length;
          let cz = zone.polygon.reduce((a, p) => a + p[1], 0) / zone.polygon.length;
          if (!pointInPolygon(cx, cz, zone.polygon)) {
            for (let ei = 0; ei < zone.polygon.length; ei++) {
              const next = (ei + 1) % zone.polygon.length;
              const mx = (zone.polygon[ei][0] + zone.polygon[next][0]) / 2;
              const mz = (zone.polygon[ei][1] + zone.polygon[next][1]) / 2;
              if (pointInPolygon(mx, mz, zone.polygon)) {
                cx = mx; cz = mz; break;
              }
            }
          }
          const [tx, ty] = toScreen(cx, cz);
          ctx.fillStyle = isActive ? '#fff' : zc.label;
          ctx.font = `${isActive ? 'bold ' : ''}9px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, tx, ty);
        });
      } else {
        // Fallback: draw rooms
        for (const room of rooms) {
          if (!room.polygon || room.polygon.length < 3) continue;
          ctx.beginPath();
          const [sx, sy] = toScreen(room.polygon[0][0], room.polygon[0][1]);
          ctx.moveTo(sx, sy);
          for (let i = 1; i < room.polygon.length; i++) {
            const [px, py] = toScreen(room.polygon[i][0], room.polygon[i][1]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw dock
      if (mapping?.dockPosition) {
        const [dx, dy] = toScreen(mapping.dockPosition[0], mapping.dockPosition[1]);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw robot position (animated pulse)
      if (displayRoom) {
        const zone = mapping?.zones?.find((z) => {
          const room = rooms.find((r) => r.id === z.roomId);
          return room?.name.toLowerCase() === displayRoom.toLowerCase()
            || z.roomId.toLowerCase() === displayRoom.toLowerCase();
        });
        if (zone && zone.polygon.length > 0) {
          const cx = zone.polygon.reduce((a, p) => a + p[0], 0) / zone.polygon.length;
          const cz = zone.polygon.reduce((a, p) => a + p[1], 0) / zone.polygon.length;
          const [rx, ry] = toScreen(cx, cz);
          const pulse = 3 + Math.sin(Date.now() / 300) * 2;

          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.beginPath();
          ctx.arc(rx, ry, pulse + 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [rooms, mapping, displayRoom, data.status]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full aspect-video rounded-lg"
      style={{ display: 'block' }}
    />
  );
}

/** Debug overlay showing real-time 3D telemetry */
function VacuumDebugOverlay({ markerId }: { markerId: string }) {
  const debug = useAppStore((s) => s.devices.vacuumDebug[markerId]);

  if (!debug) {
    return (
      <div className="bg-secondary/50 border border-border/50 rounded-lg p-3">
        <p className="text-[10px] text-muted-foreground font-mono">Väntar på telemetri från 3D-scenen…</p>
      </div>
    );
  }

  const age = Date.now() - debug.timestamp;
  const stale = age > 2000;

  return (
    <div className="bg-secondary/50 border border-border/50 rounded-lg p-3 space-y-1.5 font-mono text-[10px]">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
        <Bug size={12} />
        <span>3D Debug</span>
        <span className={cn('ml-auto text-[9px]', stale ? 'text-destructive' : 'text-green-400')}>
          {stale ? '⚠ stale' : '● live'}
        </span>
      </div>
      <Row label="Position" value={`X:${debug.pos3D[0].toFixed(2)} Y:${debug.pos3D[1].toFixed(2)} Z:${debug.pos3D[2].toFixed(2)}`} />
      <Row label="Status" value={debug.status} />
      <Row label="Aktiv zon" value={debug.activeZone ?? '—'} />
      <Row label="Target" value={debug.targetPos ? `${debug.targetPos[0].toFixed(2)}, ${debug.targetPos[1].toFixed(2)}` : '—'} />
      <Row label="Stripe" value={`${debug.stripeIdx}/${debug.stripesTotal} pt:${debug.pointIdx}`} />
      <Row label="FPS" value={`${debug.fps}`} />
      <Row label="Ålder" value={`${age}ms`} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function RobotPanel() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);
  const { vacuums, lawnMowers } = useAppStore(getRobotEntityViews);

  const vacuumMarkers = markers.filter((m) => m.kind === 'vacuum');
  const callService = (domain: string, service: string, entityId: string) => {
    haServiceCaller.current?.(domain, service, { entity_id: entityId });
  };

  if (vacuumMarkers.length === 0 && vacuums.length === 0 && lawnMowers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-muted-foreground">Ingen robotdammsugare hittad</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Design → Inredning → Enheter för att placera en</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(vacuums.length > 0 || lawnMowers.length > 0) && (
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Home Assistant-robotar</h3>
              <p className="text-[10px] text-muted-foreground">Visar upptackta robotenheter aven innan de placeras i 3D.</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{vacuums.length + lawnMowers.length} hittade</span>
          </div>

          {vacuums.map(({ entity, linked, marker }) => (
            <div key={entity.entityId} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{entity.friendlyName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{entity.entityId}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{linked && marker ? `Lankad till ${marker.name}` : 'Ej placerad i design'} · Status: {entity.state}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => callService('vacuum', 'start', entity.entityId)}>Start</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => callService('vacuum', 'return_to_base', entity.entityId)}>Docka</Button>
                </div>
              </div>
            </div>
          ))}

          {lawnMowers.map(({ entity, linked, marker }) => (
            <div key={entity.entityId} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{entity.friendlyName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{entity.entityId}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{linked && marker ? `Lankad till ${marker.name}` : 'Ej placerad i design'} · Status: {entity.state}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => callService('lawn_mower', 'start_mowing', entity.entityId)}>Start</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => callService('lawn_mower', 'dock', entity.entityId)}>Docka</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

function CleaningLog({ data }: { data: VacuumState }) {
  const log = data.cleaningLog ?? [];
  if (log.length === 0) return null;
  const recent = log.slice(-5).reverse();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <History size={14} />
        <span>Städhistorik</span>
      </div>
      <div className="space-y-1">
        {recent.map((entry, i) => (
          <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-1.5">
            <span className="text-xs text-foreground">{entry.room}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              {entry.fanPreset && <span>{entry.fanPreset}</span>}
              {entry.duration !== undefined && <span>{entry.duration} min</span>}
              <span>{new Date(entry.startedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VacuumCard({ marker, data, update }: { marker: DeviceMarker; data: VacuumState; update: (id: string, p: Record<string, unknown>) => void }) {
  const id = marker.id;
  const statusColor = statusColors[data.status] ?? 'text-muted-foreground';
  const statusLabel = statusLabels[data.status] ?? data.status;
  const entityId = marker.ha?.entityId;

  const applyOptimisticUpdate = (partial: Record<string, unknown>) => {
    setFromHA(true);
    update(id, partial);
    queueMicrotask(() => setFromHA(false));
  };

  const sendRobotService = async (service: string, serviceData: Record<string, unknown>, successPatch?: Record<string, unknown>) => {
    if (!entityId) {
      toast({
        title: 'Robot saknar Home Assistant-koppling',
        description: 'Koppla robotmarkören till en vacuum-entitet i Design först.',
        variant: 'destructive',
      });
      return false;
    }
    try {
      if (isHostedSync()) {
        await callHAService('vacuum', service, { entity_id: entityId, ...serviceData });
      } else {
        haServiceCaller.current?.('vacuum', service, { entity_id: entityId, ...serviceData });
      }
      if (successPatch) applyOptimisticUpdate(successPatch);
      return true;
    } catch (err: any) {
      toast({
        title: 'Robotkommando misslyckades',
        description: err?.message || 'Home Assistant svarade inte på kommandot.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleStartAll = () => void sendRobotService('start', {}, { on: true, status: 'cleaning', targetRoom: undefined });
  const handlePause = () => void sendRobotService('pause', {}, { status: 'paused' });
  const handleStop = () => void sendRobotService('stop', {}, { on: false, status: 'idle', targetRoom: undefined });
  const handleDock = () => void sendRobotService('return_to_base', {}, { status: 'returning', targetRoom: undefined });
  const handleLocate = () => void sendRobotService('locate', {});
  const handleFanSpeed = (presetName: string, speed: number) => void sendRobotService(
    'set_fan_speed',
    { fan_speed: presetName },
    { fanSpeed: speed, fanSpeedPreset: presetName }
  );
  const handleRoomCleaning = async (roomName: string, segmentId: number, fanPreset?: string) => {
    // If already cleaning, stop first then switch
    if (data.status === 'cleaning') {
      await sendRobotService('stop', {}, { status: 'idle', targetRoom: undefined });
      await new Promise((r) => setTimeout(r, 800));
    }
    const existing = data.cleaningLog ?? [];
    const logEntry: CleaningLogEntry = { room: roomName, startedAt: new Date().toISOString(), fanPreset };
    void sendRobotService(
      'send_command',
      { command: 'app_segment_clean', params: [segmentId] },
      {
        on: true,
        status: 'cleaning',
        currentRoom: roomName,
        targetRoom: roomName,
        cleaningLog: [...existing, logEntry],
      }
    );
  };

  const handleMultiRoomCleaning = async (rooms: { roomName: string; segmentId: number; repeat: number }[]) => {
    if (data.status === 'cleaning') {
      await sendRobotService('stop', {}, { status: 'idle', targetRoom: undefined });
      await new Promise((r) => setTimeout(r, 800));
    }
    const segments = rooms.map((r) => r.segmentId);
    const maxRepeat = Math.max(...rooms.map((r) => r.repeat));
    const roomNames = rooms.map((r) => r.roomName).join(', ');
    const existing = data.cleaningLog ?? [];
    const logEntry: CleaningLogEntry = { room: roomNames, startedAt: new Date().toISOString() };
    void sendRobotService(
      'send_command',
      { command: 'app_segment_clean', params: { segments, repeat: maxRepeat } },
      {
        on: true,
        status: 'cleaning',
        currentRoom: rooms[0].roomName,
        targetRoom: roomNames,
        cleaningLog: [...existing, logEntry],
      }
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-5">
      {/* Roborock-only notice */}
      <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
        <Info size={14} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-orange-300/80">Rumsstyrning fungerar just nu bara för Roborock-modeller</p>
      </div>

      {/* Header: Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center bg-secondary', statusColor)}>
            {data.status === 'error' ? <AlertTriangle size={20} /> : <Bot size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{marker.name || 'Robotdammsugare'}</h3>
            <p className={cn('text-xs font-medium', statusColor)}>
              {data.targetRoom && data.status === 'cleaning'
                ? `${statusLabel} · ${data.targetRoom}`
                : statusLabel}
              {data.currentRoom && data.status === 'cleaning' && !data.targetRoom && (
                <span className="text-muted-foreground ml-1">· {data.currentRoom}</span>
              )}
            </p>
          </div>
        </div>
        {marker.ha?.entityId && (
          <span className="text-[9px] text-muted-foreground/50 font-mono">{marker.ha.entityId}</span>
        )}
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

      {/* Error message — prominent banner */}
      {(data.status === 'error' || data.errorMessage) && (
        <div className="flex items-center gap-2 bg-destructive/20 border-2 border-destructive/40 rounded-lg p-3 animate-pulse">
          <AlertTriangle size={18} className="text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Fel på robot</p>
            {data.errorMessage && <p className="text-xs text-destructive/80">{data.errorMessage}</p>}
          </div>
        </div>
      )}

      {/* Battery */}
      <BatteryIndicator level={data.battery} />

      {/* Control buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant={data.status === 'cleaning' ? 'default' : 'outline'}
          className="flex-1 h-11 text-xs gap-1"
          onClick={handleStartAll}>
          <Play size={14} /> Städa allt
        </Button>
        <Button size="sm" variant={data.status === 'paused' ? 'default' : 'outline'}
          className="flex-1 h-11 text-xs gap-1"
          onClick={handlePause}>
          <Pause size={14} /> Pausa
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-11 text-xs gap-1"
          onClick={handleStop}>
          <Square size={14} /> Stoppa
        </Button>
        <Button size="sm" variant="outline" className="h-11 text-xs gap-1"
          onClick={handleDock}>
          <HomeIcon size={14} />
        </Button>
      </div>

      {/* Room zone cards */}
      <RoomZoneCards marker={marker} data={data} onStartRoomCleaning={handleRoomCleaning} onStartMultiRoomCleaning={handleMultiRoomCleaning} />

      {/* Locate */}
      <Button size="sm" variant="outline" className="w-full h-11 text-xs gap-1"
        onClick={handleLocate}>
        <MapPin size={14} /> Lokalisera (pip)
      </Button>

      {/* Fan speed */}
      <FanSpeedSelector data={data} onChange={handleFanSpeed} />

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

      {/* Dust effect toggle */}
      <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wind size={14} />
          <span>Visa dammeffekt i 3D</span>
        </div>
        <Switch
          checked={data.showDustEffect !== false}
          onCheckedChange={(checked) => update(id, { showDustEffect: checked, _3dOnly: true })}
        />
      </div>

      {/* Debug overlay toggle */}
      <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bug size={14} />
          <span>Debug-overlay (3D-position)</span>
        </div>
        <Switch
          checked={data.showDebugOverlay === true}
          onCheckedChange={(checked) => update(id, { showDebugOverlay: checked, _3dOnly: true })}
        />
      </div>

      {/* Debug overlay data */}
      {data.showDebugOverlay && <VacuumDebugOverlay markerId={id} />}

      {/* 3D Speed slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>3D-hastighet</span>
          <span className="font-mono">{(data.vacuumSpeed ?? 0.07).toFixed(2)} m/s</span>
        </div>
        <Slider
          value={[data.vacuumSpeed ?? 0.07]}
          min={0.02}
          max={0.15}
          step={0.01}
          onValueChange={([v]) => update(id, { vacuumSpeed: v, _3dOnly: true })}
        />
      </div>

      {/* Cleaning Log */}
      <CleaningLog data={data} />

      {/* Mini map */}
      <VacuumMiniMap marker={marker} data={data} />
    </div>
  );
}
