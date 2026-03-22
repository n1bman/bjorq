import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link2, Settings2, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getEnergyEntityViews } from '../../../lib/haMenuSelectors';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';

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
          {currentEntityId ? 'Byt sensor' : 'Valj sensor'}
        </Button>
      );
    }

    return (
      <div className="max-h-32 space-y-0.5 overflow-y-auto rounded bg-secondary/30 p-1">
        {sensors.map(({ entity }) => (
          <button
            key={entity.entityId}
            className="w-full truncate rounded px-1.5 py-1 text-left text-[9px] text-foreground hover:bg-primary/20"
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

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Energioverblick</h4>
          </div>
          <button onClick={() => setShowConfig((v) => !v)} className="rounded p-1 text-muted-foreground hover:bg-secondary/30">
            <Settings2 size={14} />
          </button>
        </div>

        {showConfig && (
          <div className="mb-3 space-y-2 rounded-lg bg-secondary/30 p-3">
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-[10px] text-muted-foreground">Pris/kWh</label>
              <Input type="number" step="0.1" value={energyConfig.pricePerKwh} onChange={(e) => setEnergyConfig({ pricePerKwh: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-[10px] text-muted-foreground">Valuta</label>
              <Input value={energyConfig.currency} onChange={(e) => setEnergyConfig({ currency: e.target.value })} className="h-7 text-xs" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-lg font-bold text-foreground">{totalWatts} W</p>
            <p className="text-[10px] text-muted-foreground">Just nu {haStatus === 'connected' ? '(live om kopplad)' : '(estimat)'}</p>
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
            <p className="text-[10px] text-muted-foreground">Manad · ~{(totalMonthlyKwh * energyConfig.pricePerKwh).toFixed(0)} {energyConfig.currency}</p>
          </div>
        </div>
      </div>

      {(powerSensors.length > 0 || energySensors.length > 0) && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Link2 size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">Tillgangliga HA-sensorer</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Effekt</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{powerSensors.length}</p>
            </div>
            <div className="rounded-xl bg-secondary/20 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Energi</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{energySensors.length}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground/70">Koppla sensorer till placerade enheter for live watt och kWh. Det gor energimenyn framtidssaker nar du senare lagger till fler matare i HA.</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">Veckoforbrukning per enhet</h4>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)} kWh`} />
                <Bar dataKey="kwh" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill="hsl(var(--primary))" opacity={0.6 + (index === 0 ? 0.4 : 0)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trackedDevices.length > 0 && (
        <div className="glass-panel space-y-2 rounded-2xl p-4">
          <h4 className="mb-2 text-xs font-semibold text-foreground">Enheter med energiovervakning</h4>
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
                      {watts} W {livePower && <span className="ml-0.5 text-[8px] text-primary">LIVE</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-3 text-[9px] text-muted-foreground">
                    <span>Dag: {getDeviceDailyKwh(marker).toFixed(1)} kWh</span>
                    <span>~{(getDeviceDailyKwh(marker) * energyConfig.pricePerKwh).toFixed(1)} {energyConfig.currency}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <div className="glass-panel space-y-2 rounded-2xl p-4">
        <h4 className="mb-2 text-xs font-semibold text-foreground">Aktivera energiovervakning</h4>
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
                      <span className="truncate text-primary">{marker.energyTracking.powerEntityId || 'Ej kopplad'}</span>
                    </div>
                    {renderSensorPicker(marker.id, 'power', marker.energyTracking.powerEntityId)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Link2 size={9} />
                      <span>Energisensor</span>
                      <span className="truncate text-primary">{marker.energyTracking.energyEntityId || 'Ej kopplad'}</span>
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
