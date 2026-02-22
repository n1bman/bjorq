import { useAppStore } from '@/store/useAppStore';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import RoomCard from './cards/RoomCard';

export default function DashboardGrid() {
  const floors = useAppStore((s) => s.layout.floors);
  const homeGeometry = useAppStore((s) => s.homeGeometry);

  const allRooms = floors.flatMap((f) =>
    f.rooms.map((r) => ({ ...r, floorName: f.name }))
  );

  const hasContent = allRooms.length > 0 || homeGeometry.source === 'imported';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="relative w-full h-full p-4 flex flex-col gap-4 overflow-y-auto pointer-events-auto">
        {/* Top row: Clock, Weather, Energy */}
        <div className="flex items-start gap-3 flex-wrap">
          <ClockWidget />
          <WeatherWidget />
          <EnergyWidget />
        </div>

        {/* Room cards grid */}
        {hasContent ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {allRooms.map((room) => (
              <RoomCard
                key={room.id}
                roomId={room.id}
                roomName={room.name}
                floorName={room.floorName}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">Inget hem byggt ännu</p>
              <p className="text-muted-foreground/60 text-xs">Gå till Bygge för att skapa din planlösning</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
