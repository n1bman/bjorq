import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { User, Palette, Monitor, Download, Upload, Trash2, MapPin, Info, Save, Play } from 'lucide-react';
import { createDemoLayout, createDemoDevices } from '../../../lib/demoData';
import { getDefaultState } from '../../../store/useAppStore';
import { useRef } from 'react';
import { isHostedSync, getMode } from '../../../lib/apiClient';
import { toast } from 'sonner';

const APP_VERSION = '0.1.8'; // synced with package.json

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
  const location = useAppStore((s) => s.environment.location);
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
    // Always do a browser download export
    handleExport();
    // In hosted mode, also save on server
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
    <div className="space-y-4">
      {/* Card 1: Profile info bar */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{profile.name || 'Användare'}</p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin size={9} />
                {location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Info size={9} />
                v{APP_VERSION}
              </span>
              {isHostedSync() && (
                <>
                  <span>·</span>
                  <span className="text-primary">Hosted</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Theme + Accent + Background */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
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

      {/* Card 3: Data & Backup */}
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

      {/* Card 4: System Status */}
      <SystemStatusCard />
    </div>
  );
}

function SystemStatusCard() {
  const mode = getMode();
  const hosted = mode === 'HOSTED';

  const rows = [
    { label: 'Läge', value: mode },
    { label: 'Persistens', value: hosted ? 'Disk (data/)' : 'LocalStorage' },
    { label: 'HA-anslutning', value: hosted ? 'Server Proxy' : 'Direkt WebSocket' },
    ...(hosted ? [{ label: 'Server', value: window.location.origin }] : []),
  ];

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-2">
      <div className="flex items-center gap-2">
        <Info size={14} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Systemstatus</span>
      </div>
      <div className="space-y-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
