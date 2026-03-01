import { useAppStore } from '../../../store/useAppStore';
import { Switch } from '../../ui/switch';
import { Zap, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function EnergyDeviceList() {
  const markers = useAppStore((s) => s.devices.markers);
  const updateDevice = useAppStore((s) => s.updateDevice);

  const trackedDevices = markers.filter((m) => m.energyTracking?.enabled);
  const totalWatts = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.currentWatts ?? 0), 0);
  const totalDailyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.dailyKwh ?? 0), 0);
  const totalWeeklyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.weeklyKwh ?? 0), 0);
  const totalMonthlyKwh = trackedDevices.reduce((sum, m) => sum + (m.energyTracking?.monthlyKwh ?? 0), 0);

  const maxWatts = Math.max(...trackedDevices.map((m) => m.energyTracking?.currentWatts ?? 0), 1);

  // Chart data: top consumers
  const chartData = trackedDevices
    .sort((a, b) => (b.energyTracking?.weeklyKwh ?? 0) - (a.energyTracking?.weeklyKwh ?? 0))
    .slice(0, 8)
    .map((m) => ({
      name: m.name || m.kind,
      kwh: m.energyTracking?.weeklyKwh ?? 0,
    }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Energiöversikt</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-lg font-bold text-foreground">{totalWatts} W</p>
            <p className="text-[10px] text-muted-foreground">Just nu</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{totalDailyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Idag</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{totalWeeklyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Denna vecka</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{totalMonthlyKwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-muted-foreground">Denna månad</p>
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
            .sort((a, b) => (b.energyTracking?.currentWatts ?? 0) - (a.energyTracking?.currentWatts ?? 0))
            .map((m) => {
              const watts = m.energyTracking?.currentWatts ?? 0;
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
                    <span>Dag: {(m.energyTracking?.dailyKwh ?? 0).toFixed(1)} kWh</span>
                    <span>Vecka: {(m.energyTracking?.weeklyKwh ?? 0).toFixed(1)} kWh</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Enable energy tracking per device */}
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground mb-2">Aktivera energiövervakning</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {markers.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="text-xs text-foreground">{m.name || m.kind}</span>
              <Switch
                checked={m.energyTracking?.enabled ?? false}
                onCheckedChange={(v) => updateDevice(m.id, {
                  energyTracking: { ...(m.energyTracking ?? { enabled: false }), enabled: v },
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}