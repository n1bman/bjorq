import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Eye } from 'lucide-react';

const widgetOptions: { key: 'clock' | 'weather' | 'temperature' | 'energy'; label: string }[] = [
  { key: 'clock', label: 'Klocka & datum' },
  { key: 'weather', label: 'Väder' },
  { key: 'temperature', label: 'Temperatur' },
  { key: 'energy', label: 'Energi' },
];

export default function HomeWidgetConfig() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const toggleHomeWidget = useAppStore((s) => s.toggleHomeWidget);

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
    </div>
  );
}
