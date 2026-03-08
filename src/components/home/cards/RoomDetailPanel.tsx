import { useAppStore } from '../../../store/useAppStore';
import { X, Lightbulb, Play, Zap, DoorOpen } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  roomId: string;
  onClose: () => void;
}

function getDeviceOn(state: any): boolean {
  if (!state) return false;
  return state.data?.on ?? false;
}

export default function RoomDetailPanel({ roomId, onClose }: Props) {
  const floors = useAppStore((s) => s.layout.floors);
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const toggleDeviceState = useAppStore((s) => s.toggleDeviceState);
  const savedScenes = useAppStore((s) => s.savedScenes);
  const activateScene = useAppStore((s) => s.activateScene);
  const automations = useAppStore((s) => s.automations);

  const allRooms = floors.flatMap((f) => (f.rooms ?? []).map((r) => ({ ...r, floorId: f.id })));
  const room = allRooms.find((r) => r.id === roomId);
  if (!room) return null;

  const roomDevices = markers.filter((m) => m.roomId === roomId);
  const roomScenes = savedScenes.filter((sc) => sc.linkedRoomIds?.includes(roomId));
  const roomAutomations = automations.filter((a) => a.linkedRoomIds?.includes(roomId));

  return (
    <div className="glass-panel rounded-xl p-3 w-72 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen size={14} className="text-primary" />
          <span className="text-xs font-semibold text-foreground">{room.name}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      {/* Devices */}
      {roomDevices.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enheter</span>
          {roomDevices.map((dev) => {
            const state = deviceStates[dev.id];
            const isOn = getDeviceOn(state);
            return (
              <button
                key={dev.id}
                onClick={() => toggleDeviceState(dev.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                  isOn ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/30 text-muted-foreground'
                )}
              >
                <Lightbulb size={12} className={isOn ? 'text-primary' : ''} />
                <span className="text-[11px] flex-1 truncate">{dev.name || dev.kind}</span>
                <span className="text-[9px]">{isOn ? 'PÅ' : 'AV'}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Scenes */}
      {roomScenes.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scener</span>
          {roomScenes.map((sc) => (
            <button
              key={sc.id}
              onClick={() => activateScene(sc.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-secondary/30 transition-colors"
            >
              <Play size={12} className="text-primary" />
              <span className="text-[11px] flex-1 truncate">{sc.icon} {sc.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Automations */}
      {roomAutomations.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Automatiseringar</span>
          {roomAutomations.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground"
            >
              <Zap size={12} />
              <span className="text-[11px] flex-1 truncate">{a.name}</span>
              <span className={cn('text-[9px]', a.enabled ? 'text-primary' : 'text-muted-foreground/50')}>
                {a.enabled ? 'aktiv' : 'av'}
              </span>
            </div>
          ))}
        </div>
      )}

      {roomDevices.length === 0 && roomScenes.length === 0 && roomAutomations.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">Inga enheter, scener eller automatiseringar i detta rum.</p>
      )}
    </div>
  );
}
