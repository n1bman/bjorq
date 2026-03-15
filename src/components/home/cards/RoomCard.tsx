import { useAppStore } from '../../../store/useAppStore';
import { Lightbulb, ToggleLeft, Thermometer, Wind, Bot, Camera, Refrigerator, CookingPot, WashingMachine, DoorOpen, Lock, Plug, Monitor, Fan, PanelTop, Clapperboard, ShieldAlert, Flame, Droplets, Bell, Grip, Wifi, Trees, Speaker, Music, Egg } from 'lucide-react';
import type { DeviceKind } from '../../../store/types';

const deviceIcons: Record<DeviceKind, typeof Lightbulb> = {
  light: Lightbulb,
  switch: ToggleLeft,
  sensor: Thermometer,
  climate: Wind,
  vacuum: Bot,
  camera: Camera,
  fridge: Refrigerator,
  oven: CookingPot,
  washer: WashingMachine,
  'garage-door': DoorOpen,
  'door-lock': Lock,
  'power-outlet': Plug,
  media_screen: Monitor,
  fan: Fan,
  cover: PanelTop,
  scene: Clapperboard,
  alarm: ShieldAlert,
  'water-heater': Flame,
  humidifier: Droplets,
  siren: Bell,
  valve: Grip,
  remote: Wifi,
  'lawn-mower': Trees,
  speaker: Speaker,
  soundbar: Music,
  'light-fixture': Lightbulb,
  'smart-outlet': Plug,
};

interface RoomCardProps {
  roomId: string;
  roomName: string;
  floorName: string;
}

export default function RoomCard({ roomId, roomName, floorName }: RoomCardProps) {
  const markers = useAppStore((s) => s.devices.markers);
  const roomDevices = markers.filter((m) => m.roomId === roomId);

  // Group devices by kind
  const kindCounts = roomDevices.reduce<Partial<Record<DeviceKind, number>>>((acc, d) => {
    acc[d.kind] = (acc[d.kind] || 0) + 1;
    return acc;
  }, {});

  // Placeholder temperature per room
  const temp = (20 + Math.random() * 3).toFixed(1);

  return (
    <div className="glass-panel rounded-2xl p-4 hover:bg-[hsl(220_18%_16%/0.8)] transition-colors cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground font-display">{roomName}</h3>
          <p className="text-[10px] text-muted-foreground">{floorName}</p>
        </div>
        <span className="text-xs text-muted-foreground font-display">{temp}°</span>
      </div>

      {/* Device icons */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(kindCounts).map(([kind, count]) => {
          const Icon = deviceIcons[kind as DeviceKind];
          if (!Icon) return null;
          return (
            <div key={kind} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/30">
              <Icon size={12} className="text-primary" />
              {(count ?? 0) > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
            </div>
          );
        })}
        {roomDevices.length === 0 && (
          <span className="text-[10px] text-muted-foreground/50">Inga enheter</span>
        )}
      </div>
    </div>
  );
}
