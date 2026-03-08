import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { Plus, Trash2, Zap, Clock, Monitor, Bell, Play } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Automation, AutomationTrigger, AutomationAction } from '../../../store/types';

const triggerTypes = [
  { value: 'time', label: 'Tid', icon: Clock },
  { value: 'device_state', label: 'Enhetstillstånd', icon: Monitor },
  { value: 'event', label: 'Händelse', icon: Bell },
] as const;

const actionTypes = [
  { value: 'device_toggle', label: 'Växla enhet' },
  { value: 'scene_activate', label: 'Aktivera scen' },
  { value: 'notification', label: 'Skicka notis' },
] as const;

export default function AutomationsPanel() {
  const automations = useAppStore((s) => s.automations);
  const addAutomation = useAppStore((s) => s.addAutomation);
  const removeAutomation = useAppStore((s) => s.removeAutomation);
  const updateAutomation = useAppStore((s) => s.updateAutomation);
  const toggleAutomation = useAppStore((s) => s.toggleAutomation);
  const markers = useAppStore((s) => s.devices.markers);
  const savedScenes = useAppStore((s) => s.savedScenes);
  const floors = useAppStore((s) => s.layout.floors);

  const allRooms = floors.flatMap((f) => f.rooms ?? []);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTriggerType, setNewTriggerType] = useState<AutomationTrigger['type']>('time');
  const [newTriggerTime, setNewTriggerTime] = useState('08:00');
  const [newLinkedRooms, setNewLinkedRooms] = useState<string[]>([]);
  const [newTriggerDevice, setNewTriggerDevice] = useState('');
  const [newActionType, setNewActionType] = useState<AutomationAction['type']>('device_toggle');
  const [newActionDevice, setNewActionDevice] = useState('');
  const [newActionScene, setNewActionScene] = useState('');
  const [newActionMessage, setNewActionMessage] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;

    const trigger: AutomationTrigger = {
      type: newTriggerType,
      config: newTriggerType === 'time'
        ? { time: newTriggerTime }
        : newTriggerType === 'device_state'
        ? { deviceId: newTriggerDevice, state: 'on' }
        : { event: 'manual' },
    };

    const action: AutomationAction = {
      type: newActionType,
      config: newActionType === 'device_toggle'
        ? { deviceId: newActionDevice }
        : newActionType === 'scene_activate'
        ? { sceneId: newActionScene }
        : { message: newActionMessage },
    };

    const automation: Automation = {
      id: Math.random().toString(36).slice(2, 10),
      name: newName.trim(),
      enabled: true,
      trigger,
      actions: [action],
      linkedRoomIds: newLinkedRooms.length > 0 ? newLinkedRooms : undefined,
    };

    addAutomation(automation);
    setNewName('');
    setNewLinkedRooms([]);
    setShowAdd(false);
  };

  const getTriggerLabel = (a: Automation) => {
    if (a.trigger.type === 'time') return `⏰ ${a.trigger.config.time || '—'}`;
    if (a.trigger.type === 'device_state') {
      const dev = markers.find((m) => m.id === a.trigger.config.deviceId);
      return `📟 ${dev?.name || 'Enhet'}`;
    }
    return '🔔 Händelse';
  };

  const getActionLabel = (action: AutomationAction) => {
    if (action.type === 'device_toggle') {
      const dev = markers.find((m) => m.id === action.config.deviceId);
      return `Växla ${dev?.name || 'enhet'}`;
    }
    if (action.type === 'scene_activate') {
      const scene = savedScenes.find((s) => s.id === action.config.sceneId);
      return `Aktivera "${scene?.name || 'scen'}"`;
    }
    return `Notis: ${action.config.message || '—'}`;
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Automationer</h4>
            <span className="text-[10px] text-muted-foreground">({automations.length})</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} />
          </Button>
        </div>

        {showAdd && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/30 space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Automationsnamn..."
              className="h-7 text-xs"
            />

            {/* Trigger */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Trigger</p>
              <div className="flex gap-1">
                {triggerTypes.map((t) => (
                  <Button
                    key={t.value}
                    size="sm"
                    variant={newTriggerType === t.value ? 'default' : 'outline'}
                    className="h-6 text-[10px] gap-1"
                    onClick={() => setNewTriggerType(t.value)}
                  >
                    <t.icon size={10} />
                    {t.label}
                  </Button>
                ))}
              </div>
              {newTriggerType === 'time' && (
                <Input type="time" value={newTriggerTime} onChange={(e) => setNewTriggerTime(e.target.value)} className="h-7 text-xs w-32" />
              )}
              {newTriggerType === 'device_state' && (
                <select value={newTriggerDevice} onChange={(e) => setNewTriggerDevice(e.target.value)}
                  className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">
                  <option value="">Välj enhet...</option>
                  {markers.map((m) => <option key={m.id} value={m.id}>{m.name || m.kind}</option>)}
                </select>
              )}
            </div>

            {/* Action */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Åtgärd</p>
              <div className="flex gap-1">
                {actionTypes.map((a) => (
                  <Button
                    key={a.value}
                    size="sm"
                    variant={newActionType === a.value ? 'default' : 'outline'}
                    className="h-6 text-[10px]"
                    onClick={() => setNewActionType(a.value)}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
              {newActionType === 'device_toggle' && (
                <select value={newActionDevice} onChange={(e) => setNewActionDevice(e.target.value)}
                  className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">
                  <option value="">Välj enhet...</option>
                  {markers.map((m) => <option key={m.id} value={m.id}>{m.name || m.kind}</option>)}
                </select>
              )}
              {newActionType === 'scene_activate' && (
                <select value={newActionScene} onChange={(e) => setNewActionScene(e.target.value)}
                  className="w-full h-7 text-xs bg-secondary text-foreground rounded-md px-2 border border-border">
                  <option value="">Välj scen...</option>
                  {savedScenes.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              )}
              {newActionType === 'notification' && (
                <Input value={newActionMessage} onChange={(e) => setNewActionMessage(e.target.value)} placeholder="Notismeddelande..." className="h-7 text-xs" />
              )}
            </div>

            {/* Room linking */}
            {allRooms.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Länka till rum (valfritt)</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {allRooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newLinkedRooms.includes(r.id)}
                        onChange={() => setNewLinkedRooms((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id])}
                        className="rounded border-border"
                      />
                      <span className="text-[10px] text-foreground">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" className="w-full h-7 text-[10px]" onClick={handleAdd} disabled={!newName.trim()}>
              Skapa automation
            </Button>
          </div>
        )}

        {automations.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60 text-center py-4">
            Inga automationer ännu. Klicka + för att skapa.
          </p>
        ) : (
          <div className="space-y-2">
            {automations.map((a) => (
              <div key={a.id} className={cn(
                'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                a.enabled ? 'border-border/50 bg-secondary/20' : 'border-border/20 bg-muted/20 opacity-60'
              )}>
                <Switch checked={a.enabled} onCheckedChange={() => toggleAutomation(a.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {getTriggerLabel(a)} → {a.actions.map(getActionLabel).join(', ')}
                  </p>
                </div>
                <button onClick={() => removeAutomation(a.id)} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
