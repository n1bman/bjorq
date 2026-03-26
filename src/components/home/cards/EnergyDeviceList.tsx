import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link2, Settings2, TrendingUp, Zap } from 'lucide-react';
import EnergySparkline from './EnergySparkline';
import { useMemo, useState } from 'react';
import { getEnergyEntityViews } from '../../../lib/haMenuSelectors';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';

/** Generate 24h area chart data */
function generate24hData(totalWatts: number) {
  const hour = new Date().getHours();
  const base = totalWatts * 0.4;
  return Array.from({ length: 24 }, (_, i) => {
    let mult = 0.5;
    if (i >= 7 && i <= 9) mult = 0.9;
    if (i >= 11 && i <= 13) mult = 0.75;
    if (i >= 17 && i <= 21) mult = 1.0;
    if (i >= 23 || i <= 5) mult = 0.3;
    const noise = 0.85 + Math.sin(i * 2.3 + totalWatts * 0.01) * 0.15;
    const watts = Math.round(base + totalWatts * mult * noise * 0.6);
    return {
      hour: `${String(i).padStart(2, '0')}:00`,
      watt: watts,
      isCurrent: i === hour,
    };
  });
}

export default function EnergyDeviceList() {
  const markers = useAppStore((s) => s.devices.markers);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const energyConfig = useAppStore((s) => s.energyConfig);
  const setEnergyConfig = useAppStore((s) => s.setEnergyConfig);
  const liveStates = useAppStore((s) => s.homeAssistant.liveStates);
  const haStatus = useAppStore((s) => s.homeAssistant.status);
  const { powerSensors, energySensors } = useAppStore(getEnergyEntityViews);
  const [showConfig, setShowConfig] = useState(false);
  const [pickingPowerFor, setPickingPowerFor] = useState<string | null>(null);
  const [pickingEnergyFor, setPickingEnergyFor] = useState<string | null>(null);

  const trackedDevices = markers.filter((m) => m.energyTracking?.enabled);

  const getLiveNumber = (entityId?: string) => {
    if (!entityId || haStatus !== 'connected') return undefined;
    const value = parseFloat(liveStates[entityId]?.state ?? '');
    return Number.isFinite(value) ? value : undefined;
  };

  const getDeviceWatts = (marker: typeof markers[number]) =>
    getLiveNumber(marker.energyTracking?.powerEntityId) ?? marker.energyTracking?.currentWatts ?? marker.estimatedWatts ?? 0;

  const getDeviceDailyKwh = (marker: typeof markers[number]) =>
    getLiveNumber(marker.energyTracking?.energyEntityId) ?? marker.energyTracking?.dailyKwh ?? (getDeviceWatts(marker) * 8 / 1000);

  const totalWatts = trackedDevices.reduce((sum, marker) => sum + getDeviceWatts(marker), 0);
  const totalDailyKwh = trackedDevices.reduce((sum, marker) => sum + getDeviceDailyKwh(marker), 0);
  const totalWeeklyKwh = trackedDevices.reduce((sum, marker) => sum + (marker.energyTracking?.weeklyKwh ?? getDeviceDailyKwh(marker) * 7), 0);
  const totalMonthlyKwh = trackedDevices.reduce((sum, marker) => sum + (marker.energyTracking?.monthlyKwh ?? getDeviceDailyKwh(marker) * 30), 0);

  const peakWatts = useMemo(() => {
    const data = generate24hData(totalWatts);
    return Math.max(...data.map(d => d.watt));
  }, [totalWatts]);

  const areaData = useMemo(() => generate24hData(totalWatts), [totalWatts]);

  const chartData = useMemo(() => trackedDevices
    .map((marker) => ({
      name: marker.name || marker.kind,
      kwh: marker.energyTracking?.weeklyKwh ?? (getDeviceWatts(marker) * 56 / 1000),
    }))
    .sort((a, b) => b.kwh - a.kwh)
    .slice(0, 8), [trackedDevices]);

  const maxWatts = Math.max(...trackedDevices.map(getDeviceWatts), 1);

  const renderSensorPicker = (
    markerId: string,
    type: 'power' | 'energy',
    currentEntityId?: string
  ) => {
    const sensors = type === 'power' ? powerSensors : energySensors;
    const isPicking = (type === 'power' ? pickingPowerFor : pickingEnergyFor) === markerId;
    const setPicking = type === 'power' ? setPickingPowerFor : setPickingEnergyFor;

    if (haStatus !== 'connected' || sensors.length === 0) return null;

    if (!isPicking) {
      return (
        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => setPicking(markerId)}>
          {currentEntityId ? 'Byt sensor' : 'Välj sensor'}
        </Button>
      );
    }

    return (
      <div className="max-h-32 space-y-0.5 overflow-y-auto rounded bg-secondary/30 p-1">
        {sensors.map(({ entity }) => (
          <button
            key={entity.entityId}
            className="w-full truncate rounded px-1.5 py-1 text-left text-[9px] text-foreground hover:bg-[hsl(var(--section-energy))]/20"
            onClick={() => {
              updateDevice(markerId, {
                energyTracking: {
                  ...(markers.find((m) => m.id === markerId)?.energyTracking ?? { enabled: true }),
                  ...(type === 'power' ? { powerEntityId: entity.entityId } : { energyEntityId: entity.entityId }),
                },
              });
              setPicking(null);
            }}
          >
            {entity.friendlyName || entity.entityId}
            <span className="ml-1 text-muted-foreground">({liveStates[entity.entityId]?.state ?? entity.state})</span>
          </button>
        ))}
        <button
          className="w-full rounded px-1.5 py-1 text-left text-[9px] text-destructive hover:bg-destructive/20"
          onClick={() => {
            updateDevice(markerId, {
              energyTracking: {
                ...(markers.find((m) => m.id === markerId)?.energyTracking ?? { enabled: true }),
                ...(type === 'power' ? { powerEntityId: undefined } : { energyEntityId: undefined }),
              },
            });
            setPicking(null);
          }}
        >
          Ta bort koppling
        </button>
      </div>
    );
  };

  const energyAccent = 'hsl(var(--section-energy))';

  return (
    <div className="space-y-4">
      {/* ── Hero: Settings + KPI row ── */}
      <div className="nn-widget p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[hsl(var(--section-energy))]" />
          <h4 className="text-sm font-semibold text-foreground">Energiöverblick</h4>
          {haStatus === 'connected' && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-[hsl(var(--section-energy))]/15 text-[hsl(var(--section-energy))] animate-pulse">LIVE</span>
          )}
          <div className="ml-auto">
            <button onClick={() => setShowConfig((v) => !v)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated/50 transition-colors">
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {showConfig && (
          <div className="mb-4 space-y-2 rounded-xl bg-surface-elevated/50 p-3">
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-[10px] text-muted-foreground">Pris/kWh</label>
              <Input type="number" step="0.1" value={energyConfig.pricePerKwh} onChange={(e) => setEnergyConfig({ pricePerKwh: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-[10px] text-muted-foreground">Valuta</label>
              <Input value={energyConfig.currency} onChange={(e) => setEnergyConfig({ currency: e.target.value })} className="h-7 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-[10px] text-muted-foreground">Dagsmål kWh</label>
              <Input type="number" step="1" value={energyConfig.dailyGoalKwh} onChange={(e) => setEnergyConfig({ dailyGoalKwh: parseFloat(e.target.value) || 30 })} className="h-7 text-xs" />
            </div>
          </div>
        )}

        {/* KPI row — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center" style={{ borderTop: `2px solid ${energyAccent}` }}>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Nu</p>
            <p className="text-xl font-bold font-display text-[hsl(var(--section-energy))]">{totalWatts}</p>
            <p className="text-[9px] text-muted-foreground/50">Watt</p>
          </div>
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center" style={{ borderTop: `2px solid ${energyAccent}` }}>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Idag</p>
            <p className="text-xl font-bold font-display text-[hsl(var(--section-energy))]">{totalDailyKwh.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground/50">kWh</p>
          </div>
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center" style={{ borderTop: `2px solid ${energyAccent}` }}>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Kostnad</p>
            <p className="text-xl font-bold font-display text-[hsl(var(--section-energy))]">~{(totalDailyKwh * energyConfig.pricePerKwh).toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground/50">{energyConfig.currency}</p>
          </div>
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center" style={{ borderTop: `2px solid ${energyAccent}` }}>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Peak</p>
            <p className="text-xl font-bold font-display text-[hsl(var(--section-energy))]">{peakWatts}</p>
            <p className="text-[9px] text-muted-foreground/50">Watt</p>
          </div>
        </div>

        {/* Main chart — Area chart 24h */}
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 mb-2">Förbrukningskurva (24h)</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="energyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--section-energy))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--section-energy))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: number) => [`${value} W`, 'Effekt']}
                />
                <Area
                  type="monotone"
                  dataKey="watt"
                  stroke="hsl(var(--section-energy))"
                  strokeWidth={2}
                  fill="url(#energyAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary ring + goal */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-surface-elevated/30">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--surface-elevated))" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke="hsl(var(--section-energy))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${Math.min((totalDailyKwh / energyConfig.dailyGoalKwh) * 163, 163)} 163`}
              transform="rotate(-90 32 32)"
              className="energy-ring-animate"
            />
          </svg>
          <div className="space-y-0.5">
            <p className="text-xs text-foreground font-medium">{totalDailyKwh.toFixed(1)} / {energyConfig.dailyGoalKwh} kWh</p>
            <p className="text-[10px] text-[hsl(var(--section-energy))]">{Math.round((totalDailyKwh / energyConfig.dailyGoalKwh) * 100)}% av dagsmål</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center">
            <p className="text-lg font-bold font-display text-foreground">{totalDailyKwh.toFixed(1)}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">kWh idag</p>
            <p className="text-[10px] text-[hsl(var(--section-energy))] mt-0.5">~{(totalDailyKwh * energyConfig.pricePerKwh).toFixed(1)} {energyConfig.currency}</p>
          </div>
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center">
            <p className="text-lg font-bold font-display text-foreground">{totalWeeklyKwh.toFixed(0)}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">kWh vecka</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">~{(totalWeeklyKwh * energyConfig.pricePerKwh).toFixed(0)} {energyConfig.currency}</p>
          </div>
          <div className="rounded-xl bg-surface-elevated/40 p-3 text-center">
            <p className="text-lg font-bold font-display text-foreground">{totalMonthlyKwh.toFixed(0)}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">kWh månad</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">~{(totalMonthlyKwh * energyConfig.pricePerKwh).toFixed(0)} {energyConfig.currency}</p>
          </div>
        </div>
      </div>

      {(powerSensors.length > 0 || energySensors.length > 0) && (
        <div className="nn-widget p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">HA-sensorer</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-surface-elevated/40 p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Effekt</p>
              <p className="mt-1 text-lg font-semibold font-display text-foreground">{powerSensors.length}</p>
            </div>
            <div className="rounded-xl bg-surface-elevated/40 p-3">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Energi</p>
              <p className="mt-1 text-lg font-semibold font-display text-foreground">{energySensors.length}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/60">Koppla sensorer till placerade enheter för live watt och kWh.</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="nn-widget p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-[hsl(var(--section-energy))]" />
            <h4 className="text-xs font-semibold text-foreground">Veckoförbrukning per enhet</h4>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)} kWh`} />
                <Bar dataKey="kwh" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill="hsl(var(--section-energy))" opacity={0.6 + (index === 0 ? 0.4 : 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trackedDevices.length > 0 && (
        <div className="nn-widget p-4 space-y-2">
          <h4 className="mb-2 text-xs font-semibold text-foreground">Enhetsranking</h4>
          {trackedDevices
            .sort((a, b) => getDeviceWatts(b) - getDeviceWatts(a))
            .map((marker) => {
              const watts = getDeviceWatts(marker);
              const pct = (watts / maxWatts) * 100;
              const livePower = getLiveNumber(marker.energyTracking?.powerEntityId) !== undefined;
              return (
                <div key={marker.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{marker.name || marker.kind}</span>
                    <span className="text-xs font-medium text-foreground">
                      {watts} W {livePower && <span className="ml-0.5 text-[8px] text-[hsl(var(--section-energy))]">LIVE</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                    <div className="h-full rounded-full bg-[hsl(var(--section-energy))]/70 energy-bar-animate" style={{ '--bar-width': `${pct}%` } as React.CSSProperties} />
                  </div>
                  <div className="flex gap-3 text-[9px] text-muted-foreground/60">
                    <span>Dag: {getDeviceDailyKwh(marker).toFixed(1)} kWh</span>
                    <span>~{(getDeviceDailyKwh(marker) * energyConfig.pricePerKwh).toFixed(1)} {energyConfig.currency}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <div className="nn-widget p-4 space-y-2">
        <h4 className="mb-2 text-xs font-semibold text-foreground">Energiövervakning</h4>
        <div className="max-h-80 space-y-2.5 overflow-y-auto">
          {markers.map((marker) => (
            <div key={marker.id} className="space-y-1 rounded-xl bg-secondary/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">{marker.name || marker.kind}</span>
                <Switch
                  checked={marker.energyTracking?.enabled ?? false}
                  onCheckedChange={(enabled) => updateDevice(marker.id, {
                    energyTracking: { ...(marker.energyTracking ?? { enabled: false }), enabled },
                  })}
                />
              </div>
              {marker.energyTracking?.enabled && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center gap-2">
                    <label className="shrink-0 text-[9px] text-muted-foreground">Est. W</label>
                    <Input
                      type="number"
                      value={marker.estimatedWatts ?? ''}
                      placeholder="t.ex. 60"
                      onChange={(e) => updateDevice(marker.id, { estimatedWatts: parseFloat(e.target.value) || undefined })}
                      className="h-6 w-20 text-[10px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Link2 size={9} />
                      <span>Effektsensor</span>
                      <span className="truncate text-[hsl(var(--section-energy))]">{marker.energyTracking.powerEntityId || 'Ej kopplad'}</span>
                    </div>
                    {renderSensorPicker(marker.id, 'power', marker.energyTracking.powerEntityId)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Link2 size={9} />
                      <span>Energisensor</span>
                      <span className="truncate text-[hsl(var(--section-energy))]">{marker.energyTracking.energyEntityId || 'Ej kopplad'}</span>
                    </div>
                    {renderSensorPicker(marker.id, 'energy', marker.energyTracking.energyEntityId)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
