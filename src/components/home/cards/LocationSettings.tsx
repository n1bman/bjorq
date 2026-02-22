import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

export default function LocationSettings() {
  const lat = useAppStore((s) => s.environment.location.lat);
  const lon = useAppStore((s) => s.environment.location.lon);
  const timezone = useAppStore((s) => s.environment.location.timezone);
  const setLocation = useAppStore((s) => s.setLocation);

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Plats</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Latitud</label>
          <Input
            type="number"
            step="0.01"
            value={lat}
            onChange={(e) => setLocation(parseFloat(e.target.value) || 0, lon)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Longitud</label>
          <Input
            type="number"
            step="0.01"
            value={lon}
            onChange={(e) => setLocation(lat, parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Tidszon: {timezone}</p>
    </div>
  );
}
