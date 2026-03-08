import { useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import {
  Save, Download, Upload, FolderOpen, FileText, AlertTriangle, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportBuildProject,
  importBuildProject,
  readProjectFile,
  extractBuildProject,
  calculateStats,
  type ProjectStats,
} from '../../../lib/projectIO';
import { validateProjectSchema } from '../../../lib/projectMigrations';
import { isHostedSync } from '../../../lib/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../ui/dialog';

export default function ProjectManagerPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    data: any;
    stats: ProjectStats;
    warnings: string[];
    name: string;
  } | null>(null);

  // Current project stats
  const layout = useAppStore((s) => s.layout);
  const devices = useAppStore((s) => s.devices);
  const props = useAppStore((s) => s.props);

  const currentProject = extractBuildProject();
  const currentStats = calculateStats(currentProject);

  const handleManualSave = () => {
    // In hosted mode, trigger immediate sync
    if (isHostedSync()) {
      const { syncProjectToServer } = require('../../../store/useAppStore');
      // Force sync is handled by store subscriber, but we can trigger it
      useAppStore.setState({ _lastManualSave: Date.now() } as any);
    }
    toast.success('Projekt sparat ✅');
  };

  const handleExport = () => {
    exportBuildProject();
    toast.success('Projekt exporterat ✅');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const data = await readProjectFile(file);
      const { valid, errors, warnings } = validateProjectSchema(data);

      if (!valid) {
        toast.error(`Ogiltig projektfil: ${errors.join(', ')}`);
        return;
      }

      // Extract preview stats
      const tempProject = {
        meta: data.meta ?? { schemaVersion: 1, id: 'preview', name: file.name, createdAt: '', updatedAt: '', appVersion: '' },
        layout: data.layout ?? { floors: [], activeFloorId: null, scaleCalibrated: false },
        devices: data.devices ?? { markers: [], deviceStates: {} },
        homeGeometry: data.homeGeometry ?? { source: 'procedural', imported: {} },
        props: data.props ?? { catalog: [], items: [] },
        terrain: data.terrain ?? { enabled: false, grassColor: '#4a7c3f', grassRadius: 20, trees: [] },
        activityLog: data.activityLog ?? [],
      };

      const stats = calculateStats(tempProject as any);

      setImportPreview({
        data,
        stats,
        warnings,
        name: data.meta?.name || file.name.replace(/\.json$/, ''),
      });
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte läsa projektfilen');
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;

    const result = importBuildProject(importPreview.data, 'replace');
    if (result.success) {
      toast.success('Projekt importerat ✅', {
        description: `${result.stats.floors} våningar, ${result.stats.rooms} rum, ${result.stats.devices} enheter`,
      });
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => toast.warning(w));
      }
    } else {
      toast.error(`Import misslyckades: ${result.error}`);
    }
    setImportPreview(null);
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Projekthantering</span>
      </div>

      {/* Current project overview */}
      <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-primary" />
          <span className="text-xs font-medium text-foreground">Aktuellt projekt</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span>Våningar: <strong className="text-foreground">{currentStats.floors}</strong></span>
          <span>Rum: <strong className="text-foreground">{currentStats.rooms}</strong></span>
          <span>Väggar: <strong className="text-foreground">{currentStats.walls}</strong></span>
          <span>Öppningar: <strong className="text-foreground">{currentStats.openings}</strong></span>
          <span>Enheter: <strong className="text-foreground">{currentStats.devices}</strong></span>
          <span>Möbler: <strong className="text-foreground">{currentStats.props}</strong></span>
          <span>Trappor: <strong className="text-foreground">{currentStats.stairs}</strong></span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button size="sm" variant="default" className="w-full h-9 text-xs gap-2" onClick={handleManualSave}>
          <Save size={14} /> Spara projekt
        </Button>

        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={handleExport}>
          <Download size={14} /> Exportera projekt (.json)
        </Button>

        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Importera projekt
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Export innehåller layout, enheter, material och metadata — redo att flytta till en annan installation.
      </p>

      {/* Import preview dialog */}
      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Importera projekt</DialogTitle>
            <DialogDescription>
              Projektet &quot;{importPreview?.name}&quot; kommer att ersätta aktuellt projekt.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>Våningar: <strong className="text-foreground">{importPreview.stats.floors}</strong></span>
                  <span>Rum: <strong className="text-foreground">{importPreview.stats.rooms}</strong></span>
                  <span>Väggar: <strong className="text-foreground">{importPreview.stats.walls}</strong></span>
                  <span>Öppningar: <strong className="text-foreground">{importPreview.stats.openings}</strong></span>
                  <span>Enheter: <strong className="text-foreground">{importPreview.stats.devices}</strong></span>
                  <span>Möbler: <strong className="text-foreground">{importPreview.stats.props}</strong></span>
                </div>
              </div>

              {importPreview.warnings.length > 0 && (
                <div className="space-y-1">
                  {importPreview.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-500">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportPreview(null)} className="gap-1">
              <X size={14} /> Avbryt
            </Button>
            <Button size="sm" variant="default" onClick={confirmImport} className="gap-1">
              <Check size={14} /> Importera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
