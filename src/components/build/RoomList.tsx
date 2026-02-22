import { useAppStore } from '@/store/useAppStore';
import { detectRooms } from '@/lib/roomDetection';
import { Search, Trash2, RefreshCw } from 'lucide-react';
import { getMaterialById } from '@/lib/materials';

export default function RoomList() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const setRooms = useAppStore((s) => s.setRooms);
  const removeRoom = useAppStore((s) => s.removeRoom);
  const renameRoom = useAppStore((s) => s.renameRoom);
  const pushUndo = useAppStore((s) => s.pushUndo);

  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];

  const handleDetect = () => {
    if (!floor || !activeFloorId) return;
    pushUndo();
    const detected = detectRooms(floor.walls);
    setRooms(activeFloorId, detected);
  };

  const handleRemove = (roomId: string) => {
    if (!activeFloorId) return;
    pushUndo();
    removeRoom(activeFloorId, roomId);
  };

  return (
    <div className="glass-panel rounded-xl p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display">Rum</h3>
        <button
          onClick={handleDetect}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          title="Detektera rum"
        >
          <RefreshCw size={12} />
          <span>Detektera</span>
        </button>
      </div>

      {rooms.length === 0 && (
        <p className="text-muted-foreground italic">Inga rum detekterade. Rita väggar i en sluten loop och klicka "Detektera".</p>
      )}

      {rooms.map((room) => (
        <div key={room.id} className="bg-secondary/30 rounded-lg p-2 flex items-center justify-between">
          <input
            className="bg-transparent border-none text-foreground text-xs w-24 outline-none focus:ring-1 focus:ring-primary rounded px-1"
            value={room.name}
            onChange={(e) => activeFloorId && renameRoom(activeFloorId, room.id, e.target.value)}
          />
          <div className="flex items-center gap-2 text-muted-foreground">
            {room.floorMaterialId && (
              <div
                className="w-3 h-3 rounded-sm border border-border"
                style={{ backgroundColor: getMaterialById(room.floorMaterialId)?.color }}
                title={getMaterialById(room.floorMaterialId)?.name}
              />
            )}
            <button
              onClick={() => handleRemove(room.id)}
              className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
