import { useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Clock, Droplets, Moon, Pause, Plus, Sun, Thermometer, Trash2, Wind } from 'lucide-react';
import type { ComfortCondition, ComfortRule, ComfortSchedule } from '../../../store/types';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';
import { Switch } from '../../ui/switch';
import { cn } from '../../../lib/utils';
import { getClimateEntityViews } from '../../../lib/haMenuSelectors';

const genId = () => Math.random().toString(36).slice(2, 10);

function ClimateOverview() {
  const { climates, fans, humidifiers, waterHeaters, temperatureSensors, humiditySensors } = useAppStore(getClimateEntityViews);

  const renderEntityList = (title: string, items: typeof climates, emptyLabel: string) => (
    <div className="rounded-xl bg-surface-elevated/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground/50">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map(({ entity, linked, marker, deviceState }) => (
            <div key={entity.entityId} className="rounded-lg border border-border/20 bg-surface-sunken/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{entity.friendlyName}</p>
                  <p className="truncate text-[10px] text-muted-foreground/50">{entity.entityId}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[9px]', linked ? 'bg-primary/15 text-primary' : 'bg-surface-elevated text-muted-foreground/50')}>
                  {linked ? marker?.name || 'Länkad' : 'Ej länkad'}
                </span>
              </div>
              {/* ── Nuvärde + mål — tydligt ── */}
              {deviceState?.kind === 'climate' && (
                <div className="mt-2 flex items-center gap-3">
                  <div>
                    <p className="text-lg font-bold font-display text-foreground">{deviceState.data.currentTemp}°</p>
                    <p className="text-[9px] text-muted-foreground/60">Nu</p>
                  </div>
                  <span className="text-muted-foreground/30">→</span>
                  <div>
                    <p className="text-lg font-bold font-display text-primary">{deviceState.data.targetTemp}°</p>
                    <p className="text-[9px] text-muted-foreground/60">Mål</p>
                  </div>
                  <div className="ml-auto">
                    <span className={cn(
                      'text-[10px] font-medium',
                      deviceState.data.currentTemp < deviceState.data.targetTemp ? 'text-blue-400' : 'text-orange-400'
                    )}>
                      {deviceState.data.currentTemp < deviceState.data.targetTemp ? '↑ Värmer' : '↓ Kyler'}
                    </span>
                  </div>
                </div>
              )}
              {deviceState && deviceState.kind !== 'climate' && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {deviceState.kind === 'fan' ? `${deviceState.data.speed}%` : entity.state}
                </p>
              )}
            </div>
          ))}
          {items.length > 4 && <p className="text-[10px] text-muted-foreground/50">+{items.length - 4} fler i HA</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {renderEntityList('Klimatenheter', climates, 'Inga climate.* hittades i HA.')}
      {renderEntityList('Ventilation & fukt', [...fans, ...humidifiers, ...waterHeaters], 'Inga fläktar/luftfuktare hittades.')}
      {renderEntityList('Temperatursensorer', temperatureSensors, 'Lägg till temperaturgivare i HA.')}
      {renderEntityList('Fuktsensorer', humiditySensors, 'Fuktsensorer visas här när de kopplas in.')}
    </div>
  );
}

function OverrideCard() {
  const override = useAppStore((s) => s.comfort.override);
  const setOverride = useAppStore((s) => s.setComfortOverride);
  const remaining = override.until ? Math.max(0, Math.round((new Date(override.until).getTime() - Date.now()) / 60000)) : 0;

  return (
    <div className={cn('nn-widget p-4 space-y-3', override.active && 'border-orange-500/20')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pause size={16} className={override.active ? 'text-orange-400' : 'text-muted-foreground/50'} />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Pausa regler</h4>
            {override.active && <p className="text-[10px] text-orange-400">{remaining} min kvar</p>}
          </div>
        </div>
        {override.active ? (
          <Button size="sm" variant="outline" onClick={() => setOverride({ active: false, until: undefined })} className="h-8 text-xs">
            Återaktivera
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOverride({ active: true, until: new Date(Date.now() + 30 * 60000).toISOString() })} className="h-8 text-xs gap-1">
            <Clock size={12} /> Override 30 min
          </Button>
        )}
      </div>
    </div>
  );
}

function ComfortStatus() {
  const rules = useAppStore((s) => s.comfort.rules);
  const override = useAppStore((s) => s.comfort.override);
  const liveStates = useAppStore((s) => s.homeAssistant.liveStates);
  const activeRules = rules.filter((r) => r.enabled && r.lastState === 'active');
  const sensorValues = rules.filter((r) => r.enabled && liveStates[r.sensorEntityId]).map((r) => ({
    name: r.name,
    value: parseFloat(liveStates[r.sensorEntityId]?.state ?? '0'),
    unit: (liveStates[r.sensorEntityId]?.attributes?.unit_of_measurement as string) ?? '°C',
  }));

  return (
    <div className="nn-widget p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Komfortstatus</h4>
      </div>
      {override.active && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-500/15 bg-orange-500/5 px-3 py-1.5">
          <Pause size={12} className="text-orange-400" />
          <span className="text-xs text-orange-400">Regler pausade</span>
        </div>
      )}
      {sensorValues.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {sensorValues.map((value, index) => (
            <div key={index} className="rounded-xl bg-surface-elevated/40 px-3 py-3 text-center">
              <p className="text-2xl font-bold font-display text-foreground">{value.value.toFixed(1)}<span className="text-sm text-muted-foreground">{value.unit}</span></p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mt-1">{value.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/50">Inga sensorer kopplade till klimatregler.</p>
      )}
      {activeRules.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40">Aktiva regler</p>
          {activeRules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-1.5">
              <Wind size={12} className="text-primary" />
              <span className="text-xs text-foreground">{rule.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleEditor({ rule, onSave, onCancel }: { rule: Partial<ComfortRule>; onSave: (rule: ComfortRule) => void; onCancel: () => void }) {
  const [name, setName] = useState(rule.name ?? '');
  const [sensorEntityId, setSensorEntityId] = useState(rule.sensorEntityId ?? '');
  const [condition, setCondition] = useState<ComfortCondition>(rule.condition ?? 'above');
  const [threshold, setThreshold] = useState(rule.threshold ?? 24);
  const [hysteresis, setHysteresis] = useState(rule.hysteresis ?? 0.5);
  const [targetDeviceId, setTargetDeviceId] = useState(rule.targetDeviceId ?? '');
  const [targetAction, setTargetAction] = useState(rule.targetAction ?? 'on');
  const [schedule, setSchedule] = useState<ComfortSchedule>(rule.schedule ?? 'always');
  const [dayStart, setDayStart] = useState(rule.dayStart ?? '07:00');
  const [dayEnd, setDayEnd] = useState(rule.dayEnd ?? '22:00');

  const entities = useAppStore((s) => s.homeAssistant.entities);
  const markers = useAppStore((s) => s.devices.markers);

  const sensorEntities = entities.filter((entity) =>
    entity.entityId.startsWith('sensor.') ||
    entity.entityId.startsWith('climate.') ||
    entity.attributes.device_class === 'temperature' ||
    entity.attributes.device_class === 'humidity'
  );
  const targetDevices = markers.filter((marker) => ['fan', 'climate', 'humidifier', 'water-heater'].includes(marker.kind));

  const save = () => {
    if (!name || !sensorEntityId || !targetDeviceId) return;
    onSave({
      id: rule.id ?? genId(),
      enabled: rule.enabled ?? true,
      name,
      sensorEntityId,
      condition,
      threshold,
      hysteresis,
      targetDeviceId,
      targetAction,
      schedule,
      dayStart,
      dayEnd,
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{rule.id ? 'Redigera regel' : 'Ny regel'}</h4>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Kyl ner sovrum" className="h-9 text-sm" />
      <select value={sensorEntityId} onChange={(e) => setSensorEntityId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-secondary/50 px-2 text-sm text-foreground">
        <option value="">Valj HA-sensor...</option>
        {sensorEntities.map((entity) => (
          <option key={entity.entityId} value={entity.entityId}>{entity.friendlyName || entity.entityId}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button size="sm" variant={condition === 'above' ? 'default' : 'outline'} onClick={() => setCondition('above')} className="flex-1 h-9 gap-1 text-xs">
          <ArrowUp size={12} /> Over
        </Button>
        <Button size="sm" variant={condition === 'below' ? 'default' : 'outline'} onClick={() => setCondition('below')} className="flex-1 h-9 gap-1 text-xs">
          <ArrowDown size={12} /> Under
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground"><span>Troskelvarde</span><span>{threshold}°C</span></div>
        <Slider value={[threshold]} min={10} max={35} step={0.5} onValueChange={([value]) => setThreshold(value)} />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground"><span>Hysteres</span><span>{hysteresis}°C</span></div>
        <Slider value={[hysteresis]} min={0.1} max={2} step={0.1} onValueChange={([value]) => setHysteresis(value)} />
      </div>
      <select value={targetDeviceId} onChange={(e) => setTargetDeviceId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-secondary/50 px-2 text-sm text-foreground">
        <option value="">Valj styrd enhet...</option>
        {targetDevices.map((marker) => (
          <option key={marker.id} value={marker.id}>{marker.name || marker.kind}</option>
        ))}
      </select>
      <div className="flex gap-1">
        {['on', 'off', '25', '50', '75', '100'].map((action) => (
          <Button key={action} size="sm" variant={targetAction === action ? 'default' : 'outline'} onClick={() => setTargetAction(action)} className="h-7 px-2 text-[10px]">
            {action === 'on' ? 'Pa' : action === 'off' ? 'Av' : `${action}%`}
          </Button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant={schedule === 'always' ? 'default' : 'outline'} onClick={() => setSchedule('always')} className="flex-1 h-8 gap-1 text-xs"><Clock size={12} />Alltid</Button>
        <Button size="sm" variant={schedule === 'day' ? 'default' : 'outline'} onClick={() => setSchedule('day')} className="flex-1 h-8 gap-1 text-xs"><Sun size={12} />Dag</Button>
        <Button size="sm" variant={schedule === 'night' ? 'default' : 'outline'} onClick={() => setSchedule('night')} className="flex-1 h-8 gap-1 text-xs"><Moon size={12} />Natt</Button>
      </div>
      {schedule !== 'always' && (
        <div className="flex gap-2">
          <Input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="h-8 text-xs" />
          <Input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className="h-8 text-xs" />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 h-9 text-xs">Avbryt</Button>
        <Button size="sm" onClick={save} className="flex-1 h-9 text-xs" disabled={!name || !sensorEntityId || !targetDeviceId}>Spara</Button>
      </div>
    </div>
  );
}

function RuleCard({ rule }: { rule: ComfortRule }) {
  const toggleRule = useAppStore((s) => s.toggleComfortRule);
  const removeRule = useAppStore((s) => s.removeComfortRule);
  const updateRule = useAppStore((s) => s.updateComfortRule);
  const markers = useAppStore((s) => s.devices.markers);
  const [editing, setEditing] = useState(false);
  const targetDevice = markers.find((marker) => marker.id === rule.targetDeviceId);

  if (editing) {
    return <RuleEditor rule={rule} onSave={(nextRule) => { updateRule(nextRule.id, nextRule); setEditing(false); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className={cn('nn-widget p-3 space-y-2', !rule.enabled && 'opacity-50', rule.lastState === 'active' && 'border-primary/20')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer size={14} className={rule.lastState === 'active' ? 'text-primary' : 'text-muted-foreground'} />
          <span className="text-sm font-medium text-foreground">{rule.name}</span>
        </div>
        <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
      </div>
      <div className="text-xs text-muted-foreground">
        Om temp {rule.condition === 'above' ? '>' : '<'} {rule.threshold}°C (±{rule.hysteresis}) → <span className="text-foreground">{targetDevice?.name || rule.targetDeviceId.slice(0, 8)}</span>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 flex-1 text-[10px]">Redigera</Button>
        <Button size="sm" variant="outline" onClick={() => removeRule(rule.id)} className="h-7 text-[10px] text-destructive hover:text-destructive">
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}

export default function ClimateTab() {
  const rules = useAppStore((s) => s.comfort.rules);
  const addRule = useAppStore((s) => s.addComfortRule);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-4">
      <ClimateOverview />
      <ComfortStatus />
      <OverrideCard />
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Thermometer size={16} className="text-primary" />
          Klimatregler ({rules.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)} className="h-8 gap-1 text-xs">
          <Plus size={14} /> Ny regel
        </Button>
      </div>
      {showNew && <RuleEditor rule={{}} onSave={(rule) => { addRule(rule); setShowNew(false); }} onCancel={() => setShowNew(false)} />}
      {rules.length === 0 && !showNew && (
        <div className="py-8 text-center space-y-2">
          <Droplets size={32} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Inga klimatregler skapade</p>
          <p className="text-xs text-muted-foreground/60">Nar du senare far klimat- och energienheter kan du bygga regler ovanpa riktiga HA-sensorer har.</p>
        </div>
      )}
      <div className="space-y-2">
        {rules.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
      </div>
    </div>
  );
}
