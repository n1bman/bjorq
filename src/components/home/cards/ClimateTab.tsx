import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { ComfortRule, ComfortCondition, ComfortSchedule } from '../../../store/types';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { Slider } from '../../ui/slider';
import { Input } from '../../ui/input';
import {
  Thermometer, Plus, Trash2, Clock, Zap, Pause,
  ArrowUp, ArrowDown, Sun, Moon, Activity,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

const genId = () => Math.random().toString(36).slice(2, 10);

function OverrideCard() {
  const override = useAppStore((s) => s.comfort.override);
  const setOverride = useAppStore((s) => s.setComfortOverride);

  const activate30 = () => {
    const until = new Date(Date.now() + 30 * 60_000).toISOString();
    setOverride({ active: true, until });
  };

  const deactivate = () => setOverride({ active: false, until: undefined });

  const remaining = override.until ? Math.max(0, Math.round((new Date(override.until).getTime() - Date.now()) / 60_000)) : 0;

  return (
    <div className={cn(
      'glass-panel rounded-2xl p-4 space-y-3',
      override.active && 'border-orange-500/30 bg-orange-500/5'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pause size={16} className={override.active ? 'text-orange-400' : 'text-muted-foreground'} />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Pausera regler</h4>
            {override.active && (
              <p className="text-[10px] text-orange-400">{remaining} min kvar</p>
            )}
          </div>
        </div>
        {override.active ? (
          <Button size="sm" variant="outline" onClick={deactivate} className="h-8 text-xs">
            Återaktivera
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={activate30} className="h-8 text-xs gap-1">
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
  const sensorValues = rules
    .filter((r) => r.enabled && liveStates[r.sensorEntityId])
    .map((r) => ({
      name: r.name,
      value: parseFloat(liveStates[r.sensorEntityId]?.state ?? '0'),
      unit: (liveStates[r.sensorEntityId]?.attributes?.unit_of_measurement as string) ?? '°C',
    }));

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Komfortstatus</h4>
      </div>

      {override.active && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-1.5">
          <Pause size={12} className="text-orange-400" />
          <span className="text-xs text-orange-400">Regler pauserade (override aktiv)</span>
        </div>
      )}

      {sensorValues.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {sensorValues.map((sv, i) => (
            <div key={i} className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
              <p className="text-lg font-bold text-foreground">{sv.value.toFixed(1)}{sv.unit}</p>
              <p className="text-[10px] text-muted-foreground">{sv.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Inga sensorer konfigurerade</p>
      )}

      {activeRules.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aktiva regler</p>
          {activeRules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
              <Zap size={12} className="text-primary" />
              <span className="text-xs text-foreground">{r.name}</span>
              {r.lastTriggered && (
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {new Date(r.lastTriggered).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {rules.length > 0 && activeRules.length === 0 && !override.active && (
        <p className="text-xs text-green-400">✓ Alla regler inaktiva — temperaturen är inom gränserna</p>
      )}
    </div>
  );
}

function RuleEditor({ rule, onSave, onCancel }: { rule: Partial<ComfortRule>; onSave: (r: ComfortRule) => void; onCancel: () => void }) {
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

  const sensorEntities = entities.filter((e) =>
    e.entityId.startsWith('sensor.') || e.entityId.startsWith('climate.')
  );
  const targetDevices = markers.filter((m) =>
    ['fan', 'climate', 'switch'].includes(m.kind)
  );

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
      <h4 className="text-sm font-semibold text-foreground">
        {rule.id ? 'Redigera regel' : 'Ny regel'}
      </h4>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase">Namn</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Kyla sovrum" className="h-9 text-sm" />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase">Temperaturkälla (HA-entitet)</label>
        <select
          value={sensorEntityId}
          onChange={(e) => setSensorEntityId(e.target.value)}
          className="w-full h-9 rounded-lg bg-secondary/50 border border-border px-2 text-sm text-foreground"
        >
          <option value="">Välj sensor...</option>
          {sensorEntities.map((e) => (
            <option key={e.entityId} value={e.entityId}>
              {e.friendlyName || e.entityId}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={condition === 'above' ? 'default' : 'outline'} onClick={() => setCondition('above')} className="flex-1 gap-1 h-9 text-xs">
          <ArrowUp size={12} /> Över
        </Button>
        <Button size="sm" variant={condition === 'below' ? 'default' : 'outline'} onClick={() => setCondition('below')} className="flex-1 gap-1 h-9 text-xs">
          <ArrowDown size={12} /> Under
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Tröskelvärde</span>
          <span className="font-mono">{threshold}°C</span>
        </div>
        <Slider value={[threshold]} min={10} max={35} step={0.5} onValueChange={([v]) => setThreshold(v)} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Hysteres</span>
          <span className="font-mono">{hysteresis}°C</span>
        </div>
        <Slider value={[hysteresis]} min={0.1} max={2} step={0.1} onValueChange={([v]) => setHysteresis(v)} />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase">Styrd enhet</label>
        <select
          value={targetDeviceId}
          onChange={(e) => setTargetDeviceId(e.target.value)}
          className="w-full h-9 rounded-lg bg-secondary/50 border border-border px-2 text-sm text-foreground"
        >
          <option value="">Välj enhet...</option>
          {targetDevices.map((m) => (
            <option key={m.id} value={m.id}>{m.name || `${m.kind} (${m.id.slice(0, 6)})`}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase">Åtgärd vid trigger</label>
        <div className="flex gap-1">
          {['on', 'off', '25', '50', '75', '100'].map((a) => (
            <Button key={a} size="sm" variant={targetAction === a ? 'default' : 'outline'}
              onClick={() => setTargetAction(a)} className="h-7 text-[10px] px-2">
              {a === 'on' ? 'På' : a === 'off' ? 'Av' : `${a}%`}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground uppercase">Schema</label>
        <div className="flex gap-1">
          <Button size="sm" variant={schedule === 'always' ? 'default' : 'outline'} onClick={() => setSchedule('always')} className="flex-1 h-8 text-xs gap-1">
            <Clock size={12} /> Alltid
          </Button>
          <Button size="sm" variant={schedule === 'day' ? 'default' : 'outline'} onClick={() => setSchedule('day')} className="flex-1 h-8 text-xs gap-1">
            <Sun size={12} /> Dag
          </Button>
          <Button size="sm" variant={schedule === 'night' ? 'default' : 'outline'} onClick={() => setSchedule('night')} className="flex-1 h-8 text-xs gap-1">
            <Moon size={12} /> Natt
          </Button>
        </div>
        {schedule !== 'always' && (
          <div className="flex gap-2 mt-1">
            <div className="flex-1 space-y-0.5">
              <span className="text-[9px] text-muted-foreground">Dag start</span>
              <Input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1 space-y-0.5">
              <span className="text-[9px] text-muted-foreground">Dag slut</span>
              <Input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        )}
      </div>

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
  const [editing, setEditing] = useState(false);
  const updateRule = useAppStore((s) => s.updateComfortRule);
  const markers = useAppStore((s) => s.devices.markers);

  const targetDevice = markers.find((m) => m.id === rule.targetDeviceId);

  if (editing) {
    return (
      <RuleEditor
        rule={rule}
        onSave={(r) => {
          updateRule(r.id, r);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={cn(
      'glass-panel rounded-xl p-3 space-y-2',
      !rule.enabled && 'opacity-50',
      rule.lastState === 'active' && 'border-primary/30 bg-primary/5'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer size={14} className={rule.lastState === 'active' ? 'text-primary' : 'text-muted-foreground'} />
          <span className="text-sm font-medium text-foreground">{rule.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Om temp {rule.condition === 'above' ? '>' : '<'} {rule.threshold}°C (±{rule.hysteresis}) →{' '}
        <span className="text-foreground">{targetDevice?.name || rule.targetDeviceId.slice(0, 8)}</span>{' '}
        {rule.targetAction === 'on' ? 'PÅ' : rule.targetAction === 'off' ? 'AV' : `${rule.targetAction}%`}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>
          {rule.schedule === 'always' ? '🕐 Alltid' : rule.schedule === 'day' ? `☀️ ${rule.dayStart}–${rule.dayEnd}` : `🌙 ${rule.dayEnd}–${rule.dayStart}`}
        </span>
        {rule.lastTriggered && (
          <span className="ml-auto">
            Senast: {new Date(rule.lastTriggered).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 text-[10px] flex-1">Redigera</Button>
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
      <ComfortStatus />
      <OverrideCard />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Thermometer size={16} className="text-primary" />
          Klimatregler ({rules.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowNew(true)} className="h-8 text-xs gap-1">
          <Plus size={14} /> Ny regel
        </Button>
      </div>

      {showNew && (
        <RuleEditor
          rule={{}}
          onSave={(r) => { addRule(r); setShowNew(false); }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {rules.length === 0 && !showNew && (
        <div className="text-center py-8 space-y-2">
          <Thermometer size={32} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Inga klimatregler skapade</p>
          <p className="text-xs text-muted-foreground/60">
            Skapa en regel för att automatiskt styra fläktar och klimatenheter baserat på temperatur.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>
    </div>
  );
}
