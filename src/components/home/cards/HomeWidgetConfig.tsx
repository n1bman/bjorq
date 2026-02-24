import { useAppStore } from '@/store/useAppStore';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const widgetOptions: { key: 'clock' | 'weather' | 'temperature' | 'energy'; label: string }[] = [
  { key: 'clock', label: 'Klocka & datum' },
  { key: 'weather', label: 'Väder (utomhus)' },
  { key: 'temperature', label: 'Temperatur (inomhus)' },
  { key: 'energy', label: 'Energi' },
];

const sizeOptions = [
  { key: 'small' as const, label: 'Liten' },
  { key: 'medium' as const, label: 'Medium' },
  { key: 'large' as const, label: 'Stor' },
];

export default function HomeWidgetConfig() {
  const visibleWidgets = useAppStore((s) => s.homeView.visibleWidgets);
  const toggleHomeWidget = useAppStore((s) => s.toggleHomeWidget);
  const markers = useAppStore((s) => s.devices.markers);
  const homeScreenDevices = useAppStore((s) => s.homeView.homeScreenDevices ?? []);
  const toggleHomeScreenDevice = useAppStore((s) => s.toggleHomeScreenDevice);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
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

      {/* Device widgets for home screen with per-device config */}
      {markers.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Enhets-widgets</h4>
          <p className="text-[10px] text-muted-foreground mb-2">Välj enheter och anpassa deras widgets</p>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {markers.map((m) => {
              const isSelected = homeScreenDevices.includes(m.id);
              const isExpanded = expandedDevice === m.id;
              const wc = m.widgetConfig ?? {};

              return (
                <div key={m.id} className="border border-border/20 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 p-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleHomeScreenDevice(m.id)}
                    />
                    <span className="text-xs text-foreground flex-1">{m.name || m.kind}</span>
                    {isSelected && (
                      <button
                        onClick={() => setExpandedDevice(isExpanded ? null : m.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                  {isSelected && isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                      {/* Size */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Storlek</p>
                        <div className="flex gap-1">
                          {sizeOptions.map((s) => (
                            <Button key={s.key} size="sm"
                              variant={(wc.size ?? 'medium') === s.key ? 'default' : 'outline'}
                              className="flex-1 h-6 text-[10px]"
                              onClick={() => updateDevice(m.id, { widgetConfig: { ...wc, size: s.key } })}
                            >
                              {s.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      {/* Toggles */}
                      <div className="space-y-1">
                        {[
                          { key: 'showLabel', label: 'Visa namn' },
                          { key: 'showValue', label: 'Visa värde' },
                          { key: 'showToggle', label: 'Visa av/på' },
                          ...(m.kind === 'camera' ? [{ key: 'showImage', label: 'Visa kamerabild' }] : []),
                        ].map((opt) => (
                          <div key={opt.key} className="flex items-center justify-between">
                            <span className="text-[10px] text-foreground">{opt.label}</span>
                            <Switch
                              checked={(wc as any)[opt.key] !== false}
                              onCheckedChange={(v) => updateDevice(m.id, { widgetConfig: { ...wc, [opt.key]: v } })}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Custom label */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Anpassad text</p>
                        <Input
                          value={wc.customLabel ?? ''}
                          onChange={(e) => updateDevice(m.id, { widgetConfig: { ...wc, customLabel: e.target.value } })}
                          className="h-7 text-xs"
                          placeholder={m.name || m.kind}
                        />
                      </div>
                      {/* Energy tracking toggle */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/20">
                        <span className="text-[10px] text-foreground">Visa energi</span>
                        <Switch
                          checked={m.energyTracking?.enabled ?? false}
                          onCheckedChange={(v) => updateDevice(m.id, {
                            energyTracking: { ...(m.energyTracking ?? { enabled: false }), enabled: v },
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}