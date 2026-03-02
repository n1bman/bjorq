import { useState, useRef } from 'react';
import { useAppStore, getDefaultState } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { Download, Upload, Trash2, Save, Play } from 'lucide-react';
import { isHostedSync } from '../../../lib/apiClient';
import { createDemoLayout, createDemoDevices } from '../../../lib/demoData';
import { toast } from 'sonner';

export default function DataBackupCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

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
      devices: { markers: demoDevices.markers, deviceStates },
      homeGeometry: { ...useAppStore.getState().homeGeometry, source: 'procedural' },
    });
    toast.success('Demo-projekt laddat ✅', { description: '3 rum, 4 enheter — redo att utforska.' });
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
      <div className="flex items-center gap-2">
        <Download size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Data & Backup</span>
      </div>

      {isHostedSync() && (
        <p className="text-[10px] text-muted-foreground">
          Data sparas på serverns disk (data/-mapp). Exportera/importera för backup.
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

      <div className="border-t border-border/50 pt-3 mt-1">
        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={handleLoadDemo}>
          <Play size={14} /> Ladda demo-projekt
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Laddar ett exempelhus med rum och enheter att utforska.
        </p>
      </div>
    </div>
  );
}
