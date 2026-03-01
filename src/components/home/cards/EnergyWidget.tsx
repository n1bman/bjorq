import { Zap, TrendingDown, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import { useAppStore } from '../../../store/useAppStore';

export default function EnergyWidget() {
  const [expanded, setExpanded] = useState(false);
  const energyConfig = useAppStore((s) => s.energyConfig);
  const markers = useAppStore((s) => s.devices.markers);

  // Calculate estimated totals from devices with estimatedWatts
  const trackedDevices = markers.filter((m) => m.energyTracking?.enabled);
  const totalWatts = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.currentWatts ?? m.estimatedWatts ?? 0), 0);
  const totalDailyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.dailyKwh ?? ((m.estimatedWatts ?? 0) * 8 / 1000)), 0);
  const dailyCost = totalDailyKwh * energyConfig.pricePerKwh;

  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-300',
        expanded ? 'min-w-[200px]' : 'min-w-[120px] max-w-[150px]'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-primary shrink-0" />
        <div>
          <p className="text-lg font-bold font-display text-foreground whitespace-nowrap">{totalWatts.toLocaleString('sv-SE')} W</p>
          <p className="text-[10px] text-muted-foreground whitespace-nowrap">{energyConfig.pricePerKwh} {energyConfig.currency}/kWh</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
        <TrendingDown size={14} className="text-green-400" />
        <span className="text-[11px] text-muted-foreground">Idag: {totalDailyKwh.toFixed(1)} kWh</span>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Kostnad idag: ~{dailyCost.toFixed(1)} {energyConfig.currency}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Spårade enheter: {trackedDevices.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Anslut HA för realtidsdata</p>
        </div>
      )}
    </div>
  );
}
