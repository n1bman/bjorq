import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DeviceKind, HAEntity } from '@/store/types';
import { kindToDomains } from '@/lib/haDomainMapping';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Unlink, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  deviceId: string;
  kind: DeviceKind;
  currentEntityId?: string;
  onSelect: (entityId: string) => void;
  onClear: () => void;
}

export default function HAEntityPicker({ deviceId, kind, currentEntityId, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const status = useAppStore((s) => s.homeAssistant.status);
  const entities = useAppStore((s) => s.homeAssistant.entities);
  const markers = useAppStore((s) => s.devices.markers);

  // Build a set of already-linked entity IDs (excluding current device)
  const linkedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of markers) {
      if (m.ha?.entityId && m.id !== deviceId) {
        map.set(m.ha.entityId, m.name || m.kind);
      }
    }
    return map;
  }, [markers, deviceId]);

  // Filter entities by domain
  const domains = kindToDomains[kind];
  const filtered = useMemo(() => {
    if (!domains) return entities;
    return entities.filter((e) => domains.includes(e.domain));
  }, [entities, domains]);

  const selectedEntity = entities.find((e) => e.entityId === currentEntityId);

  // Fallback: HA not connected
  if (status !== 'connected') {
    return (
      <div className="space-y-1.5">
        <label className="text-muted-foreground text-[10px]">HA Entity ID</label>
        <Input
          value={currentEntityId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="light.taklampa_kok"
          className="h-8 text-xs bg-secondary/30"
        />
        <p className="text-[9px] text-muted-foreground flex items-center gap-1">
          <WifiOff size={10} /> Anslut till HA för sökbar lista
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-[10px] flex items-center gap-1">
        <Wifi size={10} className="text-green-400" /> HA Entity
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-full flex items-center justify-between h-8 px-2 rounded-md bg-secondary/30 text-xs border border-border/50 hover:bg-secondary/50 transition-colors',
              !currentEntityId && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {selectedEntity
                ? selectedEntity.friendlyName
                : currentEntityId || 'Välj entitet...'}
            </span>
            <ChevronsUpDown size={12} className="text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 z-50" align="start">
          <Command>
            <CommandInput placeholder="Sök entitet..." />
            <CommandList>
              <CommandEmpty>Inga entiteter hittade</CommandEmpty>
              <CommandGroup heading={domains ? `${domains.join(', ')}` : 'Alla domäner'}>
                {filtered.map((entity) => {
                  const linked = linkedMap.get(entity.entityId);
                  return (
                    <CommandItem
                      key={entity.entityId}
                      value={`${entity.friendlyName} ${entity.entityId}`}
                      onSelect={() => {
                        onSelect(entity.entityId);
                        setOpen(false);
                      }}
                      disabled={!!linked}
                      className="flex flex-col items-start gap-0"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Check
                          size={12}
                          className={cn(
                            'shrink-0',
                            currentEntityId === entity.entityId ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{entity.friendlyName}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{entity.entityId}</p>
                        </div>
                        {entity.state && (
                          <span className="text-[9px] text-muted-foreground shrink-0">{entity.state}</span>
                        )}
                      </div>
                      {linked && (
                        <p className="text-[9px] text-muted-foreground/60 ml-5">Kopplad till: {linked}</p>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {currentEntityId && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[9px] text-destructive/70 hover:text-destructive transition-colors"
        >
          <Unlink size={10} /> Koppla bort
        </button>
      )}
    </div>
  );
}
