import { useState, useRef } from 'react';
import { useAppStore, getDefaultState } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Download, Upload, Trash2, Save, Play, XCircle, Database } from 'lucide-react';
import { isHostedSync, getMode } from '../../../lib/apiClient';
import { createDemoLayout, createDemoDevices } from '../../../lib/demoData';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';

export default function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deletingDemo, setDeletingDemo] = useState(false);

  // Check if current project looks like a demo (has demo-like rooms)
  const layout = useAppStore((s) => s.layout);
  const devices = useAppStore((s) => s.devices);
  const isDemoLoaded = layout.floors.some((f) =>
    f.rooms.some((r) => ['Vardagsrum', 'Kök', 'Sovrum'].includes(r.name))
  ) && devices.markers.length > 0;

  const handleExport = () => {
    const state = useAppStore.getState();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(state)) {
      if (typeof v !== 'function') data[k] = v;
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bjorq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAndBackup = async () => {
    handleExport();
    if (isHostedSync()) {
      try {
        await fetch('/api/backup', { method: 'POST' });
        toast.success('Backup sparad på servern ✅');
      } catch {
        toast.error('Kunde inte spara backup på servern.');
      }
    } else {
      toast.success('Backup exporterad ✅');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        useAppStore.setState(data);
      } catch {
        alert('Kunde inte läsa backup-filen.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    localStorage.clear();
    window.location.reload();
  };

  const handleLoadDemo = () => {
    const layout = createDemoLayout();
    const demoDevices = createDemoDevices();
    const deviceStates: Record<string, any> = {};
    demoDevices.markers.forEach((m) => {
      deviceStates[m.id] = getDefaultState(m.kind);
    });
    useAppStore.setState({
      layout,
      devices: { markers: demoDevices.markers, deviceStates, vacuumDebug: {} },
      homeGeometry: { ...useAppStore.getState().homeGeometry, source: 'procedural' },
    });
    toast.success('Demo-projekt laddat ✅', { description: '3 rum, 4 enheter — redo att utforska.' });
  };

  const handleDeleteDemo = async () => {
    setDeletingDemo(true);
    try {
      // Reset layout to empty initial state
      useAppStore.setState({
        layout: {
          floors: [
            {
              id: 'floor-1',
              name: 'Våning 1',
              elevation: 0,
              heightMeters: 2.5,
              gridSize: 0.5,
              walls: [],
              rooms: [],
              stairs: [],
              kitchenFixtures: [],
            },
          ],
          activeFloorId: 'floor-1',
          scaleCalibrated: false,
        },
        devices: { markers: [], deviceStates: {}, vacuumDebug: {} },
        homeGeometry: {
          source: 'procedural' as const,
          imported: {
            url: null,
            position: [0, 0, 0] as [number, number, number],
            rotation: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            groundLevelY: 0,
            northAngle: 0,
            floorBands: [],
          },
        },
        props: { catalog: [], items: [] },
        activityLog: [],
      });

      // In hosted mode, also notify server
      if (isHostedSync()) {
        try {
          await fetch('/api/projects/demo', { method: 'DELETE' });
        } catch {
          // Non-critical — local state is already cleared
        }
      }

      toast.success('Demo-projekt borttaget ✅', {
        description: 'Layout, enheter och markörer har rensats. Dina inställningar och profil bevarades.',
      });
    } finally {
      setDeletingDemo(false);
    }
  };

  const storageMode = getMode();

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
      <div className="flex items-center gap-2">
        <Download size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Data & Backup</span>
      </div>

      {/* Storage Mode indicator */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
        <Database size={12} className="text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Lagringsläge:</span>
        <span className={`text-[10px] font-semibold ${storageMode === 'HOSTED' ? 'text-primary' : 'text-amber-500'}`}>
          {storageMode === 'HOSTED' ? '🖥️ Server (HOSTED)' : '💾 Lokal (DEV)'}
        </span>
      </div>

      {isHostedSync() && (
        <p className="text-[10px] text-muted-foreground">
          Data sparas på serverns disk (data/-mapp). Exportera/importera för backup.
        </p>
      )}

      {!isHostedSync() && (
        <p className="text-[10px] text-muted-foreground">
          Data sparas i webbläsarens localStorage. Exportera backup regelbundet.
        </p>
      )}

      <Button size="sm" variant="default" className="w-full h-9 text-xs gap-2" onClick={handleSaveAndBackup}>
        <Save size={14} /> Spara & Backup
      </Button>

      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={handleExport}>
        <Download size={14} /> Exportera backup
      </Button>

      <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={() => fileInputRef.current?.click()}>
        <Upload size={14} /> Importera backup
      </Button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <Button
        size="sm"
        variant={confirmClear ? 'destructive' : 'outline'}
        className="w-full h-8 text-xs gap-2"
        onClick={handleClear}
      >
        <Trash2 size={14} /> {confirmClear ? 'Bekräfta: Rensa ALLT' : 'Rensa all data'}
      </Button>
      {confirmClear && (
        <p className="text-[10px] text-destructive text-center">
          Klicka igen för att radera alla inställningar och enheter permanent.
        </p>
      )}

      <div className="border-t border-border/50 pt-3 mt-1 space-y-2">
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={handleLoadDemo}>
          <Play size={14} /> Ladda demo-projekt
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          Laddar ett exempelhus med rum och enheter att utforska.
        </p>

        {isDemoLoaded && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                <XCircle size={14} /> Ta bort demo-projekt
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort demo-projekt?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">Detta kommer att:</span>
                  <span className="block">• Radera alla väggar och rum (layout)</span>
                  <span className="block">• Radera alla enhetsmarkörer och deras tillstånd</span>
                  <span className="block">• Återställa 3D-geometrin</span>
                  <span className="block">• Rensa alla props och aktivitetsloggen</span>
                  <span className="block mt-2 font-medium">Dina inställningar, profil och HA-anslutning bevaras.</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteDemo}
                  disabled={deletingDemo}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingDemo ? 'Tar bort…' : 'Ta bort demo'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
