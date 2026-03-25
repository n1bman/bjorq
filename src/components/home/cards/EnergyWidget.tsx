import { BarChart3, TrendingDown, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getEnergyEntityViews } from '../../../lib/haMenuSelectors';
import { cn } from '../../../lib/utils';
import { useAppStore } from '../../../store/useAppStore';
import EnergySparkline from './EnergySparkline';
import type { WidgetOverlaySize } from '../../../store/types';

interface Props {
  alwaysExpanded?: boolean;
  size?: WidgetOverlaySize;
}

export default function EnergyWidget({ alwaysExpanded = false, size = 'normal' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = alwaysExpanded || expanded;
  const energyConfig = useAppStore((s) => s.energyConfig);
  const markers = useAppStore((s) => s.devices.markers);
  const liveStates = useAppStore((s) => s.homeAssistant.liveStates);
  const haStatus = useAppStore((s) => s.homeAssistant.status);
  const energySelectors = useAppStore(getEnergyEntityViews);

  const trackedDevices = markers.filter((m) => m.energyTracking?.enabled);

  const totalWatts = useMemo(() => trackedDevices.reduce((sum, marker) => {
    const liveWatts = marker.energyTracking?.powerEntityId
      ? parseFloat(liveStates[marker.energyTracking.powerEntityId]?.state ?? '')
      : Number.NaN;
    return sum + (Number.isFinite(liveWatts) ? liveWatts : marker.energyTracking?.currentWatts ?? marker.estimatedWatts ?? 0);
  }, 0), [trackedDevices, liveStates]);

  const totalDailyKwh = useMemo(() => trackedDevices.reduce((sum, marker) => {
    const energyId = marker.energyTracking?.energyEntityId;
    const energyValue = energyId ? parseFloat(liveStates[energyId]?.state ?? '') : Number.NaN;
    if (Number.isFinite(energyValue)) return sum + energyValue;
    const liveWatts = marker.energyTracking?.powerEntityId
      ? parseFloat(liveStates[marker.energyTracking.powerEntityId]?.state ?? '')
      : Number.NaN;
    const watts = Number.isFinite(liveWatts) ? liveWatts : marker.energyTracking?.currentWatts ?? marker.estimatedWatts ?? 0;
    return sum + (marker.energyTracking?.dailyKwh ?? (watts * 8 / 1000));
  }, 0), [trackedDevices, liveStates]);

  const dailyCost = totalDailyKwh * energyConfig.pricePerKwh;

  // Full expanded panel mode (dashboard)
  if (isExpanded) {
    return (
      <div
        className={cn(
          'glass-panel rounded-2xl p-5 min-w-[220px]',
          !alwaysExpanded && 'cursor-pointer'
        )}
        onClick={() => !alwaysExpanded && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-primary shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground whitespace-nowrap">{totalWatts.toLocaleString('sv-SE')} W</p>
            <p className="text-[10px] text-muted-foreground whitespace-nowrap">{energyConfig.pricePerKwh} {energyConfig.currency}/kWh</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 border-t border-border/30 pt-2">
          <TrendingDown size={14} className="text-green-400" />
          <span className="text-[11px] text-muted-foreground">Idag: {totalDailyKwh.toFixed(1)} kWh</span>
        </div>
        <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Kostnad idag: ~{dailyCost.toFixed(1)} {energyConfig.currency}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Sparade enheter</span>
            <span>{trackedDevices.length}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>HA kraftsensorer</span>
            <span>{energySelectors.powerSensors.length}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>HA energisensorer</span>
            <span>{energySelectors.energySensors.length}</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {haStatus === 'connected' ? 'Livevarden prioriteras nar HA-sensorer ar länkade.' : 'Anslut HA for att lasa live-data och fler energisensorer.'}
          </p>
        </div>
      </div>
    );
  }

  // Compact overlay — just watt number + mini sparkline
  if (size === 'compact') {
    return (
      <div className="overlay-widget">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-primary shrink-0" />
          <span className="text-lg font-bold font-display text-foreground whitespace-nowrap">{totalWatts.toLocaleString('sv-SE')} W</span>
        </div>
      </div>
    );
  }

  // Expanded overlay — with mini sparkline
  if (size === 'expanded') {
    return (
      <div className="overlay-widget">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-primary shrink-0" />
          <span className="text-xl font-bold font-display text-foreground whitespace-nowrap">{totalWatts.toLocaleString('sv-SE')} W</span>
          <span className="text-[10px] text-muted-foreground/70">{totalDailyKwh.toFixed(1)} kWh</span>
        </div>
        <div className="mt-1.5">
          <EnergySparkline width={120} height={24} totalWatts={totalWatts} />
        </div>
        <div className="mt-1 text-[9px] text-muted-foreground/50">
          ~{dailyCost.toFixed(1)} {energyConfig.currency} idag
        </div>
      </div>
    );
  }

  // Normal overlay — compact
  return (
    <div className="overlay-widget">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-primary shrink-0" />
        <span className="text-xl font-bold font-display text-foreground whitespace-nowrap">{totalWatts.toLocaleString('sv-SE')} W</span>
        <span className="text-[10px] text-muted-foreground/70">{totalDailyKwh.toFixed(1)} kWh</span>
      </div>
    </div>
  );
}
