import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye } from 'lucide-react';

const widgetOptions: { key: 'clock' | 'weather' | 'temperature' | 'energy'; label: string }[] = [
  { key: 'clock', label: 'Klocka & datum' },
  { key: 'weather', label: 'Väder (utomhus)' },
  { key: 'temperature', label: 'Temperatur (inomhus)' },
  { key: 'energy', label: 'Energi' },
];

export default function HomeWidgetConfig() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const toggleHomeWidget = useAppStore((s) => s.toggleHomeWidget);
  const markers = useAppStore((s) => s.devices.markers);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const toggleHomeScreenDevice = useAppStore((s) => s.toggleHomeScreenDevice);

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Hem-widgets</h4>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">Välj vad som visas på hemskärmen</p>
      <div className="space-y-2">
        {widgetOptions.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-foreground">{label}</span>
            <Switch
              checked={visibleWidgets[key]}
              onCheckedChange={() => toggleHomeWidget(key)}
            />
          </div>
        ))}
      </div>

      {/* Device widgets for home screen */}
      {markers.length > 0 && (
        <div className="border-t border-border/30 pt-3 mt-3">
          <p className="text-[10px] text-muted-foreground mb-2">Enhets-widgets på hemskärmen</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {markers.map((m) => (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={homeScreenDevices.includes(m.id)}
                  onCheckedChange={() => toggleHomeScreenDevice(m.id)}
                />
                <span className="text-xs text-foreground">{m.name || m.kind}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
