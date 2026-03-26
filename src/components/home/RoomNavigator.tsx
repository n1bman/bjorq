import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DoorOpen, X, Camera } from 'lucide-react';
import { cn } from '../../lib/utils';
import { flyTo, cameraForPolygon } from '../../lib/cameraRef';
import RoomDetailPanel from './cards/RoomDetailPanel';

interface RoomNavigatorProps {
  style?: React.CSSProperties;
}

export default function RoomNavigator({ style }: RoomNavigatorProps) {
  const floors = useAppStore((s) => s.layout.floors);
  const markers = useAppStore((s) => s.devices.markers);
  const [open, setOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const allRooms = floors.flatMap((f) =>
    (f.rooms ?? []).map((r) => ({ ...r, floorId: f.id, floorName: f.name }))
  );

  if (allRooms.length === 0) return null;

  const handleRoomClick = (room: typeof allRooms[0]) => {
    if (room.cameraPreset) {
      flyTo(room.cameraPreset.position, room.cameraPreset.target);
    } else if (room.polygon && room.polygon.length >= 3) {
      const auto = cameraForPolygon(room.polygon);
      flyTo(auto.position, auto.target);
    }
    setSelectedRoomId(room.id);
  };

  const getDeviceCount = (roomId: string) =>
    markers.filter((m) => m.roomId === roomId).length;

  const getLightCount = (roomId: string) =>
    markers.filter((m) => m.roomId === roomId && m.kind === 'light').length;

  const handleClose = () => {
    setOpen(false);
    setSelectedRoomId(null);
  };

  return (
    <div className="z-50 flex flex-col-reverse items-end gap-2 pointer-events-auto" style={style}>
      <button
        onClick={() => { if (open) handleClose(); else setOpen(true); }}
        className={cn(
          'w-14 h-14 rounded-full glass-panel flex items-center justify-center transition-all',
          open || selectedRoomId ? 'text-primary amber-glow' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <DoorOpen size={20} />
      </button>

      {selectedRoomId && (
        <RoomDetailPanel roomId={selectedRoomId} onClose={() => setSelectedRoomId(null)} />
      )}

      {open && !selectedRoomId && (
        <div className="glass-panel rounded-xl p-3 w-64 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Rum</span>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          {allRooms.map((room) => {
            const lights = getLightCount(room.id);
            const devices = getDeviceCount(room.id);
            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-secondary/30 transition-colors group"
              >
                <DoorOpen size={14} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{room.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {devices > 0 ? `${devices} enheter` : 'Inga enheter'}
                    {lights > 0 && ` · ${lights} ljus`}
                  </p>
                </div>
                {room.cameraPreset && (
                  <Camera size={10} className="text-muted-foreground/50 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
