import { useState } from 'react';
import { Bell, Clock, Monitor, Play, Plus, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import { cn } from '../../../lib/utils';
import type { Automation, AutomationAction, AutomationTrigger } from '../../../store/types';
import { getAutomationEntityViews } from '../../../lib/haMenuSelectors';
import { haServiceCaller } from '../../../hooks/useHomeAssistant';

const triggerTypes = [
  { value: 'time', label: 'Tid', icon: Clock },
  { value: 'device_state', label: 'Enhetstillstand', icon: Monitor },
  { value: 'event', label: 'Handelse', icon: Bell },
] as const;

const actionTypes = [
  { value: 'device_toggle', label: 'Vaxla enhet' },
  { value: 'scene_activate', label: 'Aktivera scen' },
  { value: 'notification', label: 'Skicka notis' },
] as const;

export default function AutomationsPanel() {
  const automations = useAppStore((s) => s.automations);
  const addAutomation = useAppStore((s) => s.addAutomation);
  const removeAutomation = useAppStore((s) => s.removeAutomation);
  const toggleAutomation = useAppStore((s) => s.toggleAutomation);
  const markers = useAppStore((s) => s.devices.markers);
  const savedScenes = useAppStore((s) => s.savedScenes);
  const floors = useAppStore((s) => s.layout.floors);
  const haAutomations = useAppStore(getAutomationEntityViews);

  const allRooms = floors.flatMap((floor) => floor.rooms ?? []);

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

  const callService = (domain: string, service: string, data: Record<string, unknown>) => {
    haServiceCaller.current?.(domain, service, data);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">HA-automationer</h4>
            <span className="text-[10px] text-muted-foreground">({haAutomations.length})</span>
          </div>
        </div>
        {haAutomations.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">Inga automation.* hittades i Home Assistant ännu.</p>
        ) : (
          <div className="space-y-2">
            {haAutomations.map(({ entity, linked, marker }) => (
              <div key={entity.entityId} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{entity.friendlyName}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{entity.entityId}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Status: {entity.state} {linked && marker ? `· Lankad till ${marker.name}` : '· Ej länkad i design'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={entity.state === 'on'} onCheckedChange={(enabled) => callService('automation', enabled ? 'turn_on' : 'turn_off', { entity_id: entity.entityId })} />
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => callService('automation', 'trigger', { entity_id: entity.entityId })}>
                      <Play size={10} /> Kor
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h4 className="text-sm font-semibold text-foreground">BjorQ-automationer</h4>
            <span className="text-[10px] text-muted-foreground">({automations.length})</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={14} />
          </Button>
        </div>

        {showAdd && (
          <div className="mb-4 space-y-3 rounded-lg bg-secondary/30 p-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Automationsnamn..." className="h-7 text-xs" />

            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Trigger</p>
              <div className="flex gap-1">
                {triggerTypes.map((triggerType) => (
                  <Button key={triggerType.value} size="sm" variant={newTriggerType === triggerType.value ? 'default' : 'outline'} className="h-6 gap-1 text-[10px]" onClick={() => setNewTriggerType(triggerType.value)}>
                    <triggerType.icon size={10} />
                    {triggerType.label}
                  </Button>
                ))}
              </div>
              {newTriggerType === 'time' && <Input type="time" value={newTriggerTime} onChange={(e) => setNewTriggerTime(e.target.value)} className="h-7 w-32 text-xs" />}
              {newTriggerType === 'device_state' && (
                <select value={newTriggerDevice} onChange={(e) => setNewTriggerDevice(e.target.value)} className="h-7 w-full rounded-md border border-border bg-secondary px-2 text-xs text-foreground">
                  <option value="">Valj enhet...</option>
                  {markers.map((marker) => <option key={marker.id} value={marker.id}>{marker.name || marker.kind}</option>)}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Atgard</p>
              <div className="flex gap-1">
                {actionTypes.map((actionType) => (
                  <Button key={actionType.value} size="sm" variant={newActionType === actionType.value ? 'default' : 'outline'} className="h-6 text-[10px]" onClick={() => setNewActionType(actionType.value)}>
                    {actionType.label}
                  </Button>
                ))}
              </div>
              {newActionType === 'device_toggle' && (
                <select value={newActionDevice} onChange={(e) => setNewActionDevice(e.target.value)} className="h-7 w-full rounded-md border border-border bg-secondary px-2 text-xs text-foreground">
                  <option value="">Valj enhet...</option>
                  {markers.map((marker) => <option key={marker.id} value={marker.id}>{marker.name || marker.kind}</option>)}
                </select>
              )}
              {newActionType === 'scene_activate' && (
                <select value={newActionScene} onChange={(e) => setNewActionScene(e.target.value)} className="h-7 w-full rounded-md border border-border bg-secondary px-2 text-xs text-foreground">
                  <option value="">Valj scen...</option>
                  {savedScenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.icon} {scene.name}</option>)}
                </select>
              )}
              {newActionType === 'notification' && <Input value={newActionMessage} onChange={(e) => setNewActionMessage(e.target.value)} placeholder="Notismeddelande..." className="h-7 text-xs" />}
            </div>

            {allRooms.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">Lanka till rum (valfritt)</p>
                <div className="max-h-24 space-y-1 overflow-y-auto">
                  {allRooms.map((room) => (
                    <label key={room.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newLinkedRooms.includes(room.id)}
                        onChange={() => setNewLinkedRooms((prev) => prev.includes(room.id) ? prev.filter((id) => id !== room.id) : [...prev, room.id])}
                        className="rounded border-border"
                      />
                      <span className="text-[10px] text-foreground">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" className="h-7 w-full text-[10px]" onClick={handleAdd} disabled={!newName.trim()}>
              Skapa automation
            </Button>
          </div>
        )}

        {automations.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-muted-foreground/60">Inga BjorQ-automationer ännu. Klicka + for att skapa.</p>
        ) : (
          <div className="space-y-2">
            {automations.map((automation) => (
              <div key={automation.id} className={cn('flex items-center gap-3 rounded-lg border p-2.5 transition-all', automation.enabled ? 'border-border/50 bg-secondary/20' : 'border-border/20 bg-muted/20 opacity-60')}>
                <Switch checked={automation.enabled} onCheckedChange={() => toggleAutomation(automation.id)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{automation.name}</p>
                  <p className="text-[9px] text-muted-foreground">{automation.trigger.type} → {automation.actions.map((action) => action.type).join(', ')}</p>
                </div>
                <button onClick={() => removeAutomation(automation.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/20">
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
