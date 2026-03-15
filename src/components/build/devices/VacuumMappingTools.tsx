import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { MapPin, Trash2, PenTool, Home as HomeIcon, Edit3, Hash } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { BuildTool } from '../../../store/types';

export default function VacuumMappingTools() {
  const activeTool = useAppStore((s) => s.build.activeTool);
  const setBuildTool = useAppStore((s) => s.setBuildTool);
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const markers = useAppStore((s) => s.devices.markers);
  const removeVacuumZone = useAppStore((s) => s.removeVacuumZone);
  const renameVacuumZone = useAppStore((s) => s.renameVacuumZone);
  const updateVacuumZoneSegmentId = useAppStore((s) => s.updateVacuumZoneSegmentId);
  const haEntities = useAppStore((s) => s.homeAssistant.entities);
  const vacuumSegmentMap = useAppStore((s) => s.homeAssistant.vacuumSegmentMap);
  const rooms = floors.find((f) => f.id === activeFloorId)?.rooms ?? [];

  const floor = floors.find((f) => f.id === activeFloorId);
  const hasVacuum = markers.some((m) => m.kind === 'vacuum' && m.floorId === activeFloorId);
  const mapping = floor?.vacuumMapping;

  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!hasVacuum) return null;

  // Get HA room names from vacuum sensors (e.g. Roborock current_room)
  // Check both 'room_list' and 'options' attributes (Roborock uses 'options')
  const haRoomNames = haEntities
    .filter((e) => e.domain === 'sensor' && (e.attributes?.['room_list'] || e.attributes?.['options']))
    .flatMap((e) => {
      const list = (e.attributes['room_list'] as string[]) ?? (e.attributes['options'] as string[]) ?? [];
      return list;
    });

  // Unique room name options: floor rooms + HA rooms
  const roomOptions = Array.from(new Set([
    ...rooms.map((r) => r.name),
    ...haRoomNames,
  ])).filter(Boolean);

  const getZoneRoomName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId || r.name === roomId);
    return room?.name ?? roomId;
  };

  const isHASynced = (roomId: string) => {
    const name = getZoneRoomName(roomId).toLowerCase();
    // Check if any HA entity references this room
    return haEntities.some((e) =>
      e.attributes?.['current_room']?.toString().toLowerCase() === name ||
      haRoomNames.some((r) => r.toLowerCase() === name)
    );
  };

  const startEdit = (roomId: string) => {
    setEditingZone(roomId);
    setEditValue(getZoneRoomName(roomId));
  };

  const commitEdit = (oldRoomId: string) => {
    const newName = editValue.trim();
    if (newName && newName !== oldRoomId && activeFloorId) {
      renameVacuumZone(activeFloorId, oldRoomId, newName);
    }
    setEditingZone(null);
  };

  return (
    <div className="border-t border-border mt-3 pt-3 px-2">
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 hidden lg:block">
        Robot Mapping
      </h4>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => setBuildTool('place-vacuum-dock' as BuildTool)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'lg:justify-start justify-center',
            activeTool === 'place-vacuum-dock'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <HomeIcon size={16} />
          <span className="hidden lg:inline">Placera docka</span>
        </button>

        <button
          onClick={() => setBuildTool('vacuum-zone' as BuildTool)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all',
            'lg:justify-start justify-center',
            activeTool === 'vacuum-zone'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
          )}
        >
          <PenTool size={16} />
          <span className="hidden lg:inline">Rita robotzon</span>
        </button>
      </div>

      {/* Use existing rooms as vacuum zones */}
      {rooms.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider px-1 hidden lg:block">
            Befintliga rum
          </p>
          {rooms.map((room) => {
            const existingZone = mapping?.zones?.find((z) => z.roomId === room.id);
            const isIncluded = !!existingZone;
            return (
              <div key={room.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px] hover:bg-secondary/20">
                <input
                  type="checkbox"
                  checked={isIncluded}
                  onChange={() => {
                    if (!activeFloorId) return;
                    if (isIncluded) {
                      removeVacuumZone(activeFloorId, room.id);
                    } else if (room.polygon && room.polygon.length >= 3) {
                      const addZone = useAppStore.getState().addVacuumZone;
                      addZone(activeFloorId, { roomId: room.id, polygon: room.polygon });
                    }
                  }}
                  className="rounded border-border"
                />
                <span className="text-foreground/80 truncate flex-1">{room.name}</span>
                {isIncluded && (
                  <div className="flex items-center gap-1">
                    <Hash size={10} className="text-muted-foreground/50" />
                    <input
                      type="number"
                      placeholder="Seg-ID"
                      className="w-12 bg-secondary/40 border border-border rounded px-1 py-0.5 text-[9px] text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                      value={existingZone?.segmentId ?? ''}
                      onChange={(e) => {
                        if (activeFloorId) {
                          const val = e.target.value ? parseInt(e.target.value) : undefined;
                          updateVacuumZoneSegmentId(activeFloorId, room.id, val);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dock status */}
      {mapping?.dockPosition && (
        <div className="mt-2 px-1 text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin size={12} className="text-green-400" />
          <span>Docka: ({mapping.dockPosition[0].toFixed(1)}, {mapping.dockPosition[1].toFixed(1)})</span>
        </div>
      )}

      {/* Zone list */}
      {mapping?.zones && mapping.zones.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider px-1 hidden lg:block">
            Zoner ({mapping.zones.length})
          </p>
          {mapping.zones.map((zone) => {
            const roomName = getZoneRoomName(zone.roomId);
            const synced = isHASynced(zone.roomId);
            const isEditing = editingZone === zone.roomId;

            return (
              <div key={zone.roomId}>
                <div className="flex items-center justify-between px-2 py-1.5 rounded text-[10px] text-muted-foreground hover:bg-secondary/20 group">
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    <span className="text-primary/60">🤖</span>
                    {isEditing ? (
                      <div className="flex-1 min-w-0 flex gap-1">
                        <input
                          autoFocus
                          className="flex-1 min-w-0 bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(zone.roomId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(zone.roomId);
                            if (e.key === 'Escape') setEditingZone(null);
                          }}
                          list={`room-options-${zone.roomId}`}
                        />
                        <datalist id={`room-options-${zone.roomId}`}>
                          {roomOptions.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(zone.roomId)}
                          className="truncate font-medium text-foreground/80 hover:text-foreground cursor-text text-left"
                          title="Klicka för att byta namn"
                        >
                          {roomName}
                        </button>
                        {synced ? (
                          <span className="text-green-400 flex-shrink-0" role="img" aria-label="Synkad">✓</span>
                        ) : (
                          <span className="text-yellow-500/70 flex-shrink-0" role="img" aria-label="Ej synkad">⚠</span>
                        )}
                      </>
                    )}
                    <span className="text-muted-foreground/50 flex-shrink-0">({zone.polygon.length} pkt)</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(zone.roomId)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <Edit3 size={11} />
                      </button>
                    )}
                    <button
                      onClick={() => activeFloorId && removeVacuumZone(activeFloorId, zone.roomId)}
                      className="text-destructive/60 hover:text-destructive p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 pb-1">
                  <Hash size={10} className="text-muted-foreground/50 flex-shrink-0" />
                  {Object.keys(vacuumSegmentMap).length > 0 ? (
                    <select
                      className="flex-1 min-w-0 bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-[9px] text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                      value={zone.segmentId ?? ''}
                      onChange={(e) => {
                        if (activeFloorId) {
                          const val = e.target.value ? parseInt(e.target.value) : undefined;
                          updateVacuumZoneSegmentId(activeFloorId, zone.roomId, val);
                        }
                      }}
                    >
                      <option value="">Välj segment…</option>
                      {Object.entries(vacuumSegmentMap).map(([name, segId]) => (
                        <option key={name} value={segId}>
                          {name} → #{segId}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="number"
                        placeholder="Segment-ID"
                        className="w-16 bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-[9px] text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                        value={zone.segmentId ?? ''}
                        onChange={(e) => {
                          if (activeFloorId) {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            updateVacuumZoneSegmentId(activeFloorId, zone.roomId, val);
                          }
                        }}
                      />
                      <span className="text-[8px] text-muted-foreground/40 hidden lg:inline">manuellt</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

      {/* HA segment map reference */}
          {Object.keys(vacuumSegmentMap).length > 0 && (
            <div className="mt-2 px-1 hidden lg:block">
              <p className="text-[8px] text-green-400/70 mb-1">
                ✅ Segment-ID via roborock.get_maps:
              </p>
              <div className="space-y-0.5">
                {Object.entries(vacuumSegmentMap).map(([name, segId]) => (
                  <div key={name} className="flex items-center justify-between text-[8px]">
                    <span className="text-muted-foreground truncate">{name}</span>
                    <span className="text-green-400 font-mono ml-1">#{segId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(vacuumSegmentMap).length === 0 && (
            <div className="px-1 mt-1 hidden lg:block">
              <p className="text-[8px] text-muted-foreground/50">
                💡 Segment-ID krävs för rumsstyrning. Hämta via HA:
              </p>
              <p className="text-[8px] text-muted-foreground/40 mt-0.5">
                Utvecklarverktyg → Tjänster → roborock.get_maps → Anropa
              </p>
              <p className="text-[8px] text-muted-foreground/40">
                Eller ange segment-ID manuellt per rum ovan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      {mapping?.zones && mapping.zones.length === 0 && (
        <p className="mt-2 px-1 text-[9px] text-muted-foreground/60 italic">
          Rita en zon i ett rum så vet roboten var den kan städa. Dubbelklicka för att stänga polygonen.
        </p>
      )}
    </div>
  );
}
