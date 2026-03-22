import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Database, Download, Play, Save, Trash2, Upload, XCircle } from 'lucide-react';
import { useAppStore, getDefaultState } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import {
  createHostedBackup,
  exportHostedBackup,
  getMode,
  isHostedSync,
  resetHostedData,
  restoreHostedBackup,
} from '../../../lib/apiClient';
import { createDemoDevices, createDemoLayout } from '../../../lib/demoData';
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

  const layout = useAppStore((s) => s.layout);
  const devices = useAppStore((s) => s.devices);
  const isDemoLoaded = layout.floors.some((floor) =>
    floor.rooms.some((room) => ['Vardagsrum', 'Kök', 'Sovrum'].includes(room.name))
  ) && devices.markers.length > 0;

  const handleExport = () => {
    if (isHostedSync()) {
      exportHostedBackup()
        .then((data) => {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `bjorq-backup-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          URL.revokeObjectURL(url);
        })
        .catch((err: any) => {
          toast.error(err?.message || 'Kunde inte exportera backup.');
        });
      return;
    }

    const state = useAppStore.getState();
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state)) {
      if (typeof value !== 'function') data[key] = value;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bjorq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAndBackup = async () => {
    handleExport();
    if (isHostedSync()) {
      try {
        const result = await createHostedBackup();
        toast.success('Backup sparad på servern', {
          description: result?.filename ? `Fil: ${result.filename}` : undefined,
        });
      } catch (err: any) {
        toast.error(err?.message || 'Kunde inte spara backup på servern.');
      }
      return;
    }

    toast.success('Backup exporterad');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (isHostedSync()) {
          const result = await restoreHostedBackup(data);
          toast.success('Backup återställd', {
            description: result?.snapshotFilename ? `Säkerhetskopia skapad: ${result.snapshotFilename}` : undefined,
          });
          window.location.reload();
          return;
        }

        useAppStore.setState(data);
        toast.success('Backup importerad');
      } catch (err: any) {
        toast.error(err?.message || 'Kunde inte läsa backup-filen.');
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

    if (isHostedSync()) {
      resetHostedData()
        .then((result) => {
          toast.success('Serverdata rensad', {
            description: result?.snapshotFilename ? `Säkerhetskopia skapad: ${result.snapshotFilename}` : undefined,
          });
          window.location.reload();
        })
        .catch((err: any) => {
          toast.error(err?.message || 'Kunde inte rensa serverdata.');
        });
      return;
    }

    localStorage.clear();
    window.location.reload();
  };

  const handleLoadDemo = () => {
    const demoLayout = createDemoLayout();
    const demoDevices = createDemoDevices();
    const deviceStates: Record<string, unknown> = {};

    demoDevices.markers.forEach((marker) => {
      deviceStates[marker.id] = getDefaultState(marker.kind);
    });

    useAppStore.setState({
      layout: demoLayout,
      devices: { markers: demoDevices.markers, deviceStates, vacuumDebug: {} },
      homeGeometry: { ...useAppStore.getState().homeGeometry, source: 'procedural' },
    });

    toast.success('Demo-projekt laddat', {
      description: '3 rum och 4 enheter är redo att utforska.',
    });
  };

  const handleDeleteDemo = async () => {
    setDeletingDemo(true);
    try {
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

      if (isHostedSync()) {
        try {
          await fetch('/api/projects/demo', { method: 'DELETE' });
        } catch {
          // Local state is already cleared; this is non-critical.
        }
      }

      toast.success('Demo-projekt borttaget', {
        description: 'Layout, enheter och markörer har rensats. Inställningar och profil bevarades.',
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

      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1.5">
        <Database size={12} className="text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Lagringsläge:</span>
        <span className={`text-[10px] font-semibold ${storageMode === 'HOSTED' ? 'text-primary' : 'text-amber-500'}`}>
          {storageMode === 'HOSTED' ? 'Server (HOSTED)' : 'Lokal (DEV)'}
        </span>
      </div>

      {isHostedSync() ? (
        <p className="text-[10px] text-muted-foreground">
          Data sparas på serverns disk. Restore och reset skapar nu också en serverbackup innan något skrivs över.
        </p>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          Data sparas i webbläsarens localStorage. Exportera backup regelbundet.
        </p>
      )}

      <Button size="sm" variant="default" className="h-9 w-full gap-2 text-xs" onClick={handleSaveAndBackup}>
        <Save size={14} /> Spara & Backup
      </Button>

      <Button size="sm" variant="outline" className="h-8 w-full gap-2 text-xs" onClick={handleExport}>
        <Download size={14} /> Exportera backup
      </Button>

      <Button size="sm" variant="outline" className="h-8 w-full gap-2 text-xs" onClick={() => fileInputRef.current?.click()}>
        <Upload size={14} /> Importera backup
      </Button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <Button
        size="sm"
        variant={confirmClear ? 'destructive' : 'outline'}
        className="h-8 w-full gap-2 text-xs"
        onClick={handleClear}
      >
        <Trash2 size={14} /> {confirmClear ? 'Bekräfta: Rensa ALLT' : 'Rensa all data'}
      </Button>
      {confirmClear && (
        <p className="text-center text-[10px] text-destructive">
          Klicka igen för att radera all lagrad data. I hosted-läge skapas först en säkerhetskopia på servern.
        </p>
      )}

      <div className="mt-1 space-y-2 border-t border-border/50 pt-3">
        <Button size="sm" variant="outline" className="h-8 w-full gap-2 text-xs" onClick={handleLoadDemo}>
          <Play size={14} /> Ladda demo-projekt
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Laddar ett exempelhus med rum och enheter att utforska.
        </p>

        {isDemoLoaded && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
              >
                <XCircle size={14} /> Ta bort demo-projekt
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort demo-projekt?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">Detta kommer att:</span>
                  <span className="block">• Radera alla väggar och rum</span>
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
