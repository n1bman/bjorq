import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { User, Palette, Monitor, Download, Upload, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { isHostedSync } from '../../../lib/apiClient';

const themes = [
  { key: 'dark' as const, label: 'Mörkt' },
  { key: 'midnight' as const, label: 'Midnatt' },
  { key: 'light' as const, label: 'Ljust' },
];

const accents = [
  { color: '#f59e0b', label: 'Guld' },
  { color: '#3b82f6', label: 'Blå' },
  { color: '#10b981', label: 'Grön' },
  { color: '#ef4444', label: 'Röd' },
  { color: '#8b5cf6', label: 'Lila' },
];

const backgrounds = [
  { key: 'scene3d' as const, label: '3D-vy' },
  { key: 'gradient' as const, label: 'Gradient' },
  { key: 'solid' as const, label: 'Enfärgad' },
];

export default function ProfilePanel() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
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

  return (
    <div className="space-y-4">
      {/* Card 1: Profile + Theme + Accent + Background */}
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        {/* Profile name */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Profil</span>
          </div>
          <Input
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
            placeholder="Ditt namn"
            className="h-8 text-sm"
          />
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Tema</span>
          </div>
          <div className="flex gap-2">
            {themes.map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={profile.theme === key ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => setProfile({ theme: key })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Accentfärg</span>
          </div>
          <div className="flex gap-2 justify-center">
            {accents.map(({ color, label }) => (
              <button
                key={color}
                title={label}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-transform',
                  profile.accentColor === color ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: color }}
                onClick={() => setProfile({ accentColor: color })}
              />
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground">Bakgrund</span>
          <div className="flex gap-2">
            {backgrounds.map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={profile.dashboardBg === key ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => setProfile({ dashboardBg: key })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Card 2: Data & Backup */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Download size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Data & Backup</span>
        </div>

        {isHostedSync() && (
          <p className="text-[10px] text-muted-foreground">
            Data sparas på serverns disk (data/-mapp). Exportera/importera för backup.
          </p>
        )}

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
      </div>
    </div>
  );
}
