import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Unlink, Wifi, WifiOff } from 'lucide-react';
import type { DeviceKind } from '../../../store/types';
import { useAppStore } from '../../../store/useAppStore';
import { kindToDomains } from '../../../lib/haDomainMapping';
import { cn } from '../../../lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../ui/command';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

interface Props {
  deviceId: string;
  kind: DeviceKind;
  currentEntityId?: string;
  onSelect: (entityId: string) => void;
  onClear: () => void;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/gi, '');

export default function HAEntityPicker({ deviceId, kind, currentEntityId, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const status = useAppStore((s) => s.homeAssistant.status);
  const entities = useAppStore((s) => s.homeAssistant.entities);
  const markers = useAppStore((s) => s.devices.markers);
  const currentMarker = markers.find((marker) => marker.id === deviceId);

  const linkedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const marker of markers) {
      if (marker.ha?.entityId && marker.id !== deviceId) {
        map.set(marker.ha.entityId, marker.name || marker.kind);
      }
    }
    return map;
  }, [markers, deviceId]);

  const domains = kindToDomains[kind];
  const filtered = useMemo(() => {
    if (!domains) return entities;
    return entities.filter((entity) => domains.includes(entity.domain));
  }, [entities, domains]);

  const currentName = normalize(currentMarker?.name || '');
  const suggested = useMemo(() => filtered.filter((entity) => {
    if (entity.entityId === currentEntityId) return true;
    if (!currentName) return false;
    return normalize(entity.friendlyName).includes(currentName) || normalize(entity.entityId).includes(currentName);
  }), [filtered, currentEntityId, currentName]);
  const remaining = useMemo(() => filtered.filter((entity) => !suggested.some((candidate) => candidate.entityId === entity.entityId)), [filtered, suggested]);
  const selectedEntity = entities.find((entity) => entity.entityId === currentEntityId);

  if (status !== 'connected') {
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground">HA Entity ID</label>
        <Input value={currentEntityId ?? ''} onChange={(e) => onSelect(e.target.value)} placeholder="light.taklampa_kok" className="h-8 bg-secondary/30 text-xs" />
        <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <WifiOff size={10} /> Anslut till HA for sokbar lista
        </p>
      </div>
    );
  }

  const renderGroup = (heading: string, items: typeof filtered) => (
    <CommandGroup heading={heading}>
      {items.map((entity) => {
        const linked = linkedMap.get(entity.entityId);
        return (
          <CommandItem
            key={entity.entityId}
            value={`${entity.friendlyName} ${entity.entityId}`}
            onSelect={() => {
              onSelect(entity.entityId);
              setOpen(false);
            }}
            className="flex flex-col items-start gap-0"
          >
            <div className="flex w-full items-center gap-2">
              <Check size={12} className={cn('shrink-0', currentEntityId === entity.entityId ? 'opacity-100' : 'opacity-0')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{entity.friendlyName}</p>
                <p className="truncate text-[9px] text-muted-foreground">{entity.entityId}</p>
              </div>
              {entity.state && <span className="shrink-0 text-[9px] text-muted-foreground">{entity.state}</span>}
            </div>
            {linked && <p className="ml-5 text-[9px] text-amber-500/80">Kopplad till: {linked}</p>}
          </CommandItem>
        );
      })}
    </CommandGroup>
  );

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Wifi size={10} className="text-green-400" /> HA Entity
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn('flex h-8 w-full items-center justify-between rounded-md border border-border/50 bg-secondary/30 px-2 text-xs transition-colors hover:bg-secondary/50', !currentEntityId && 'text-muted-foreground')}>
            <span className="truncate">{selectedEntity ? selectedEntity.friendlyName : currentEntityId || 'Valj entitet...'}</span>
            <ChevronsUpDown size={12} className="shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-50 w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Sok entitet..." />
            <CommandList>
              <CommandEmpty>Inga entiteter hittade</CommandEmpty>
              {suggested.length > 0 && renderGroup('Foreslagna', suggested)}
              {renderGroup(domains ? domains.join(', ') : 'Alla domaner', remaining)}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {currentEntityId && (
        <button onClick={onClear} className="flex items-center gap-1 text-[9px] text-destructive/70 transition-colors hover:text-destructive">
          <Unlink size={10} /> Koppla bort
        </button>
      )}
    </div>
  );
}
