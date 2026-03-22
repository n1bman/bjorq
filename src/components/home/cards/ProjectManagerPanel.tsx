import { useRef, useState } from 'react';
import { useAppStore, persistHostedProjectNow, getActiveHostedProjectId } from '../../../store/useAppStore';
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

  const _floors = useAppStore((s) => s.layout.floors);
  const currentProject = extractBuildProject();
  const currentStats = calculateStats(currentProject);

  const handleManualSave = async () => {
    if (isHostedSync()) {
      try {
        await persistHostedProjectNow();
        toast.success('Projekt sparat', {
          description: `Serverprojekt: ${getActiveHostedProjectId()}`,
        });
      } catch (err: any) {
        toast.error('Kunde inte spara projektet', {
          description: err?.data?.error || err?.message || 'Serverlagring misslyckades',
        });
      }
      return;
    }

    toast.success('Projekt sparat');
  };

  const handleExport = () => {
    exportBuildProject();
    toast.success('Projektfil exporterad');
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
      toast.error(err.message || 'Kunde inte lasa projektfilen');
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;

    const result = importBuildProject(importPreview.data, 'replace');
    if (result.success) {
      if (isHostedSync()) {
        try {
          await persistHostedProjectNow();
        } catch (err: any) {
          toast.error('Projekt importerat lokalt men kunde inte sparas till servern', {
            description: err?.data?.error || err?.message || 'Serverlagring misslyckades',
          });
          setImportPreview(null);
          return;
        }
      }
      toast.success('Projekt importerat', {
        description: `${result.stats.floors} vaningar, ${result.stats.rooms} rum, ${result.stats.devices} enheter`,
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
      <div className="flex items-start gap-2">
        <FolderOpen size={14} className="mt-0.5 text-muted-foreground" />
        <div>
          <span className="text-xs font-semibold text-foreground">Projektfil</span>
          <p className="text-[10px] text-muted-foreground">
            Ritning, 3D-modell, material, props och enheter for det aktuella hemmet.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-primary" />
          <span className="text-xs font-medium text-foreground">Aktuellt projekt</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span>Vaningar: <strong className="text-foreground">{currentStats.floors}</strong></span>
          <span>Rum: <strong className="text-foreground">{currentStats.rooms}</strong></span>
          <span>Vaggar: <strong className="text-foreground">{currentStats.walls}</strong></span>
          <span>Oppningar: <strong className="text-foreground">{currentStats.openings}</strong></span>
          <span>Enheter: <strong className="text-foreground">{currentStats.devices}</strong></span>
          <span>Mobler: <strong className="text-foreground">{currentStats.props}</strong></span>
          <span>Trappor: <strong className="text-foreground">{currentStats.stairs}</strong></span>
        </div>
      </div>

      <div className="space-y-2">
        <Button size="sm" variant="default" className="w-full h-9 text-xs gap-2" onClick={handleManualSave}>
          <Save size={14} /> Spara aktuellt projekt
        </Button>

        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={handleExport}>
          <Download size={14} /> Exportera projektfil (.json)
        </Button>

        <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Importera projektfil
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Projektfilen innehaller layout, 3D-geometri, material, props, enheter och projektmetadata. Profil, tema, standby,
        konton och hel backup foljer inte med.
      </p>

      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Importera projektfil</DialogTitle>
            <DialogDescription>
              Projektet &quot;{importPreview?.name}&quot; kommer att ersatta aktuellt projekt.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>Vaningar: <strong className="text-foreground">{importPreview.stats.floors}</strong></span>
                  <span>Rum: <strong className="text-foreground">{importPreview.stats.rooms}</strong></span>
                  <span>Vaggar: <strong className="text-foreground">{importPreview.stats.walls}</strong></span>
                  <span>Oppningar: <strong className="text-foreground">{importPreview.stats.openings}</strong></span>
                  <span>Enheter: <strong className="text-foreground">{importPreview.stats.devices}</strong></span>
                  <span>Mobler: <strong className="text-foreground">{importPreview.stats.props}</strong></span>
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
