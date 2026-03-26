import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import type { CustomColors, SavedTheme } from '../../../store/types';

interface ThemeExport {
  _type: 'bjorq-theme-export';
  theme: string;
  accentColor: string;
  dashboardBg: string;
  customColors?: CustomColors;
  savedThemes?: SavedTheme[];
}

export default function ThemeBackupCard() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportTheme = () => {
    const payload: ThemeExport = {
      _type: 'bjorq-theme-export',
      theme: profile.theme,
      accentColor: profile.accentColor,
      dashboardBg: profile.dashboardBg,
      customColors: profile.customColors ? { ...profile.customColors, recentColors: undefined } : undefined,
      savedThemes: profile.savedThemes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bjorq-theme-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as ThemeExport;
        if (data._type !== 'bjorq-theme-export') throw new Error('Invalid format');

        // Merge saved themes (dedupe by name)
        const existingNames = new Set((profile.savedThemes || []).map(t => t.name));
        const newSaved = (data.savedThemes || []).filter(t => !existingNames.has(t.name));
        const mergedSaved = [...(profile.savedThemes || []), ...newSaved];

        setProfile({
          theme: data.theme as any,
          accentColor: data.accentColor || profile.accentColor,
          dashboardBg: data.dashboardBg as any,
          customColors: data.customColors ? { ...data.customColors, recentColors: profile.customColors?.recentColors } : profile.customColors,
          savedThemes: mergedSaved.length > 0 ? mergedSaved as any : undefined,
        });
      } catch {
        alert('Ogiltig temafil.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
      <span className="text-xs font-semibold text-foreground">Teman — Export & Import</span>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Exportera dina temainställningar (färger, sparade teman) eller importera från en fil.
      </p>
      <div className="flex gap-2">
        <button
          onClick={exportTheme}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-border/50 text-xs text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Download size={13} /> Exportera
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-border/50 text-xs text-foreground hover:bg-secondary/50 transition-colors"
        >
          <Upload size={13} /> Importera
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importTheme(f);
          e.target.value = '';
        }} />
      </div>
    </div>
  );
}
