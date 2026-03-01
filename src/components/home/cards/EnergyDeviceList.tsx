import { useAppStore } from '../../../store/useAppStore';
import { Switch } from '../../ui/switch';
import { Input } from '../../ui/input';
import { Zap, TrendingUp, Settings2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState } from 'react';

export default function EnergyDeviceList() {
  const markers = useAppStore((s) => s.devices.markers);
  const updateDevice = useAppStore((s) => s.updateDevice);
  const energyConfig = useAppStore((s) => s.energyConfig);
  const setEnergyConfig = useAppStore((s) => s.setEnergyConfig);
  const [showConfig, setShowConfig] = useState(false);

  const trackedDevices = markers.filter((m) => m.energyTracking?.enabled);
  const totalWatts = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.currentWatts ?? m.estimatedWatts ?? 0), 0);
  const totalDailyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.dailyKwh ?? ((m.estimatedWatts ?? 0) * 8 / 1000)), 0);
  const totalWeeklyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.weeklyKwh ?? totalDailyKwh * 7), 0);
  const totalMonthlyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.monthlyKwh ?? totalDailyKwh * 30), 0);

  const maxWatts = Math.max(...trackedDevices.map((m) => m.energyTracking?.currentWatts ?? m.estimatedWatts ?? 0), 1);

  const chartData = trackedDevices
    .sort((a, b) => (b.energyTracking?.weeklyKwh ?? (b.estimatedWatts ?? 0) * 56 / 1000) - (a.energyTracking?.weeklyKwh ?? (a.estimatedWatts ?? 0) * 56 / 1000))
    .slice(0, 8)
    .map((m) => ({
      name: m.name || m.kind,
      kwh: m.energyTracking?.weeklyKwh ?? ((m.estimatedWatts ?? 0) * 56 / 1000),
    }));

  return (
    <div className="space-y-4">
      {/* Energy config */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Energiöversikt</h4>
          </div>
          <button onClick={() => setShowConfig(!showConfig)} className="p-1 rounded hover:bg-secondary/30 text-muted-foreground">
            <Settings2 size={14} />
          </button>
        </div>

        {showConfig && (
          <div className="mb-3 p-3 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-20 shrink-0">Pris/kWh</label>
              <Input
                type="number"
                step="0.1"
                value={energyConfig.pricePerKwh}
                onChange={(e) => setEnergyConfig({ pricePerKwh: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-20 shrink-0">Valuta</label>
              <Input
                value={energyConfig.currency}
                onChange={(e) => setEnergyConfig({ currency: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-lg font-bold text-foreground">{totalWatts} W</p>
            <p className="text-[10px] text-muted-foreground">Just nu</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{totalDailyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Idag · ~{(totalDailyKwh * energyConfig.pricePerKwh).toFixed(1)} {energyConfig.currency}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{totalWeeklyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Vecka · ~{(totalWeeklyKwh * energyConfig.pricePerKwh).toFixed(0)} {energyConfig.currency}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{totalMonthlyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Månad · ~{(totalMonthlyKwh * energyConfig.pricePerKwh).toFixed(0)} {energyConfig.currency}</p>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      {chartData.length > 0 && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">Veckoförbrukning per enhet</h4>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                <Tooltip formatter={(val: number) => `${val.toFixed(1)} kWh`} />
                <Bar dataKey="kwh" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--primary))`} opacity={0.6 + (i === 0 ? 0.4 : 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Device list with consumption */}
      {trackedDevices.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground mb-2">Enheter med energiövervakning</h4>
          {trackedDevices
            .sort((a, b) => (b.energyTracking?.currentWatts ?? b.estimatedWatts ?? 0) - (a.energyTracking?.currentWatts ?? a.estimatedWatts ?? 0))
            .map((m) => {
              const watts = m.energyTracking?.currentWatts ?? m.estimatedWatts ?? 0;
              const pct = (watts / maxWatts) * 100;
              return (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">{m.name || m.kind}</span>
                    <span className="text-xs font-medium text-foreground">{watts} W</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-[9px] text-muted-foreground">
                    <span>Dag: {(m.energyTracking?.dailyKwh ?? (watts * 8 / 1000)).toFixed(1)} kWh</span>
                    <span>~{((m.energyTracking?.dailyKwh ?? (watts * 8 / 1000)) * energyConfig.pricePerKwh).toFixed(1)} {energyConfig.currency}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Enable energy tracking + estimated watts */}
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground mb-2">Aktivera energiövervakning</h4>
        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {markers.map((m) => (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">{m.name || m.kind}</span>
                <Switch
                  checked={m.energyTracking?.enabled ?? false}
                  onCheckedChange={(v) => updateDevice(m.id, {
                    energyTracking: { ...(m.energyTracking ?? { enabled: false }), enabled: v },
                  })}
                />
              </div>
              {(m.energyTracking?.enabled) && (
                <div className="flex items-center gap-2 pl-1">
                  <label className="text-[9px] text-muted-foreground shrink-0">Est. W:</label>
                  <Input
                    type="number"
                    value={m.estimatedWatts ?? ''}
                    placeholder="t.ex. 60"
                    onChange={(e) => updateDevice(m.id, { estimatedWatts: parseFloat(e.target.value) || undefined })}
                    className="h-6 text-[10px] w-20"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
