import { useAppStore } from '../../store/useAppStore';
import type { SnapMode, WeatherCondition } from '../../store/types';
import {
  Undo2, Redo2, Eye, Box, Layers, Settings2,
  ArrowLeft, Ghost,
  Grid3X3, XCircle, Sun, Check, HelpCircle, Sparkles, DoorOpen, Trash2, Edit3, Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Slider } from '../ui/slider';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import FloorPicker from './FloorPicker';
import { useState } from 'react';
import { toast } from 'sonner';
import { detectRooms, healWalls } from '../../lib/roomDetection';

/* ═══════════════════════════════════════════════
   RoomManager — inlined to avoid Vite resolve issues
   ═══════════════════════════════════════════════ */

function polygonArea(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area) / 2;
}

function RoomManager() {
  const activeFloorId = useAppStore((s) => s.layout.activeFloorId);
  const floors = useAppStore((s) => s.layout.floors);
  const renameRoom = useAppStore((s) => s.renameRoom);
  const removeRoom = useAppStore((s) => s.removeRoom);
  const setSelection = useAppStore((s) => s.setSelection);
  const selectedId = useAppStore((s) => s.build.selection.type === 'room' ? s.build.selection.id : null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const floor = floors.find((f) => f.id === activeFloorId);
  const rooms = floor?.rooms ?? [];
  const startEdit = (id: string, name: string) => { setEditingId(id); setEditValue(name); };
  const commitEdit = (id: string) => { if (editValue.trim() && activeFloorId) renameRoom(activeFloorId, id, editValue.trim()); setEditingId(null); };
  if (rooms.length === 0) return <p className="text-xs text-muted-foreground py-2 text-center">Inga rum. Rita väggar och klicka Optimera.</p>;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rum ({rooms.length})</h4>
      {rooms.map((room) => {
        const area = room.polygon ? polygonArea(room.polygon) : 0;
        return (
          <div key={room.id} onClick={() => setSelection({ type: 'room', id: room.id })} className={cn('flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer group', selectedId === room.id ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary/20')}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {editingId === room.id ? (
                <input autoFocus className="flex-1 min-w-0 bg-secondary/40 border border-border rounded px-1.5 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50" value={editValue} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit(room.id)} onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(room.id); if (e.key === 'Escape') setEditingId(null); }} />
              ) : (
                <><span className="truncate font-medium">{room.name}</span>{area > 0 && <span className="text-[9px] text-muted-foreground/60 shrink-0">{area.toFixed(1)} m²</span>}</>
              )}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId !== room.id && <button onClick={(e) => { e.stopPropagation(); startEdit(room.id, room.name); }} className="p-0.5 text-muted-foreground hover:text-foreground"><Edit3 size={12} /></button>}
              <button onClick={(e) => { e.stopPropagation(); if (activeFloorId) removeRoom(activeFloorId, room.id); }} className="p-0.5 text-destructive/60 hover:text-destructive"><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const viewModes = [
  { key: 'topdown' as const, label: '2D', icon: Eye },
  { key: '3d' as const, label: '3D', icon: Box },
  { key: 'floor-isolate' as const, label: 'Isolera', icon: Layers },
];


const gridSizes = [0.1, 0.25, 0.5, 1.0];
const snapModes: { key: SnapMode; label: string }[] = [
  { key: 'strict', label: 'Strikt' },
  { key: 'soft', label: 'Mjuk' },
  { key: 'off', label: 'Av' },
];

export default function BuildTopToolbar() {
  const setAppMode = useAppStore((s) => s.setAppMode);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoLen = useAppStore((s) => s.build.undoStack.length);
  const redoLen = useAppStore((s) => s.build.redoStack.length);
  const grid = useAppStore((s) => s.build.grid);
  const setGrid = useAppStore((s) => s.setGrid);
  const toggleGrid = useAppStore((s) => s.toggleGrid);
  const cameraMode = useAppStore((s) => s.build.view.cameraMode);
  const setCameraMode = useAppStore((s) => s.setCameraMode);
  const showGhost = useAppStore((s) => s.build.view.showOtherFloorsGhost);
  
  const setView = useAppStore((s) => s.setView);
  const clearAllFloors = useAppStore((s) => s.clearAllFloors);
  const sunAzimuth = useAppStore((s) => s.environment.sunAzimuth);
  const sunElevation = useAppStore((s) => s.environment.sunElevation);
  const setSunPosition = useAppStore((s) => s.setSunPosition);
  const weatherCondition = useAppStore((s) => s.environment.weather.condition);
  const setWeather = useAppStore((s) => s.setWeather);
  const envSource = useAppStore((s) => s.environment.source);
  const setWeatherSource = useAppStore((s) => s.setWeatherSource);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="relative z-50 flex items-center gap-1.5 px-2 py-1 border-b border-border bg-card/90 backdrop-blur-sm h-12">
      {/* Back */}
      <button
        onClick={() => { toast.success('Sparad!'); setAppMode('home'); }}
        title="Tillbaka"
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Undo / Redo */}
      <button onClick={undo} disabled={undoLen === 0} title="Ångra"
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Undo2 size={18} />
      </button>
      <button onClick={redo} disabled={redoLen === 0} title="Gör om"
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 disabled:opacity-30 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
        <Redo2 size={18} />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* View toggle */}
      <div className="flex items-center bg-secondary/30 rounded-xl p-0.5">
        {viewModes.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setCameraMode(key)}
            title={label}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all min-h-[36px]',
              cameraMode === key
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Keyboard shortcuts */}
      <Dialog>
        <DialogTrigger asChild>
          <button title="Tangentbordsgenvägar" className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            <HelpCircle size={16} />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tangentbordsgenvägar</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ['Ctrl/⌘ + Z', 'Ångra'],
              ['Ctrl/⌘ + Shift + Z', 'Gör om'],
              ['Ctrl/⌘ + C', 'Kopiera'],
              ['Ctrl/⌘ + V', 'Klistra in'],
              ['Delete / Backspace', 'Radera markerat'],
              ['Escape', 'Avmarkera / Avbryt'],
              ['W', 'Väggverktyg'],
              ['S', 'Välj-verktyg'],
              ['D', 'Dörrverktyg'],
              ['G', 'Rutnät av/på'],
              ['Scroll', 'Zooma'],
              ['Högerklick + dra', 'Rotera kamera'],
              ['Mittenklick + dra', 'Panorera kamera'],
            ].map(([key, desc]) => (
              <div key={key} className="flex justify-between">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{key}</kbd>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Optimize button */}
      <button
        onClick={() => {
          const s = useAppStore.getState();
          const floorId = s.layout.activeFloorId;
          if (!floorId) return;
          const floor = s.layout.floors.find((f) => f.id === floorId);
          if (!floor) return;

          s.pushUndo();
          let removedWalls = 0;
          let mergedWalls = 0;

          // Remove very short walls (<5cm)
          const longWalls = floor.walls.filter((w) => {
            const len = Math.sqrt((w.to[0] - w.from[0]) ** 2 + (w.to[1] - w.from[1]) ** 2);
            if (len < 0.05) { removedWalls++; return false; }
            return true;
          });

          // Remove duplicate walls (same from/to within tolerance)
          const eps = 0.05;
          const unique = longWalls.filter((w, i) => {
            for (let j = 0; j < i; j++) {
              const other = longWalls[j];
              const sameDir = Math.abs(w.from[0] - other.from[0]) < eps && Math.abs(w.from[1] - other.from[1]) < eps &&
                              Math.abs(w.to[0] - other.to[0]) < eps && Math.abs(w.to[1] - other.to[1]) < eps;
              const revDir = Math.abs(w.from[0] - other.to[0]) < eps && Math.abs(w.from[1] - other.to[1]) < eps &&
                             Math.abs(w.to[0] - other.from[0]) < eps && Math.abs(w.to[1] - other.from[1]) < eps;
              if (sameDir || revDir) { mergedWalls++; return false; }
            }
            return true;
          });

          // Re-detect rooms
          const newRooms = detectRooms(unique, floor.rooms);

          useAppStore.setState((prev: any) => ({
            layout: {
              ...prev.layout,
              floors: prev.layout.floors.map((f: any) =>
                f.id === floorId ? { ...f, walls: unique, rooms: newRooms } : f
              ),
            },
          }));

          const parts: string[] = [];
          if (removedWalls > 0) parts.push(`${removedWalls} korta segment borttagna`);
          if (mergedWalls > 0) parts.push(`${mergedWalls} dubbelväggar borttagna`);
          parts.push(`${newRooms.length} rum detekterade`);
          toast.success(`Optimerat: ${parts.join(', ')}`);
        }}
        title="Optimera & synka rum"
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Sparkles size={16} />
      </button>

      {/* Room manager popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button title="Hantera rum" className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            <DoorOpen size={16} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-72 p-3 bg-card border-border max-h-96 overflow-y-auto">
          <RoomManager />
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ghost toggle */}
      <button
        onClick={() => setView({ showOtherFloorsGhost: !showGhost })}
        title="Visa andra våningar"
        className={cn(
          'p-2.5 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          showGhost ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
        )}
      >
        <Ghost size={16} />
      </button>

      {/* Settings popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button title="Inställningar" className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Settings2 size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-64 p-3 space-y-4 bg-card border-border">
          {/* Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><Grid3X3 size={13} /> Rutnät</span>
              <button onClick={toggleGrid} className={cn('text-[10px] px-2 py-0.5 rounded', grid.enabled ? 'bg-primary/20 text-primary' : 'bg-secondary/40 text-muted-foreground')}>
                {grid.enabled ? 'PÅ' : 'AV'}
              </button>
            </div>
            <div className="flex gap-2">
              <select value={grid.sizeMeters} onChange={(e) => setGrid({ sizeMeters: parseFloat(e.target.value) })}
                className="flex-1 h-7 px-1.5 rounded-md bg-secondary/50 text-xs border-none outline-none" style={{ colorScheme: 'dark' }}>
                {gridSizes.map((s) => <option key={s} value={s}>{s} m</option>)}
              </select>
              <select value={grid.snapMode} onChange={(e) => setGrid({ snapMode: e.target.value as SnapMode })}
                className="flex-1 h-7 px-1.5 rounded-md bg-secondary/50 text-xs border-none outline-none" style={{ colorScheme: 'dark' }}>
                {snapModes.map((sm) => <option key={sm.key} value={sm.key}>{sm.label}</option>)}
              </select>
            </div>
          </div>

          {/* Sun & Weather */}
          <div className="space-y-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><Sun size={13} /> Sol & Väder</span>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Riktning</span>
              <div className="flex items-center gap-2">
                <Slider min={0} max={360} step={1} value={[sunAzimuth]}
                  onValueChange={([v]) => setSunPosition(v, sunElevation)} className="flex-1" />
                <span className="text-[10px] w-7 text-right">{sunAzimuth}°</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Höjd</span>
              <div className="flex items-center gap-2">
                <Slider min={5} max={90} step={1} value={[sunElevation]}
                  onValueChange={([v]) => setSunPosition(sunAzimuth, v)} className="flex-1" />
                <span className="text-[10px] w-7 text-right">{sunElevation}°</span>
              </div>
            </div>
            <div className="flex gap-1">
              {(['clear', 'cloudy', 'rain', 'snow'] as WeatherCondition[]).map((w) => (
                <button key={w} onClick={() => { setWeather(w); if (envSource === 'auto') setWeatherSource('manual'); }}
                  className={cn('flex-1 py-1.5 rounded-lg text-[10px]', weatherCondition === w && envSource !== 'auto' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground')}>
                  {w === 'clear' ? '☀️' : w === 'cloudy' ? '☁️' : w === 'rain' ? '🌧️' : '❄️'}
                </button>
              ))}
            </div>
            <button onClick={() => setWeatherSource(envSource === 'auto' ? 'manual' : 'auto')}
              className={cn('w-full py-1.5 rounded-lg text-[10px] font-medium', envSource === 'auto' ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground')}>
              {envSource === 'auto' ? '🌍 Live (aktiv)' : '🌍 Live väder'}
            </button>
          </div>

          {/* Clear */}
          <div className="border-t border-border pt-3">
            {!showClearConfirm ? (
              <button onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors">
                <XCircle size={13} /> Rensa allt
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground text-center">Alla väggar, rum och möbler tas bort permanent.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-1.5 rounded-lg bg-secondary/50 text-xs">Avbryt</button>
                  <button onClick={() => { clearAllFloors(); setShowClearConfirm(false); }} className="flex-1 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs">Rensa</button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Floor picker */}
      <FloorPicker />

      {/* Done button */}
      <button
        onClick={() => { toast.success('Sparad!'); setAppMode('home'); }}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors ml-1 min-h-[44px]"
      >
        <Check size={16} />
        <span className="hidden sm:inline">Klar</span>
      </button>
    </div>
  );
}
