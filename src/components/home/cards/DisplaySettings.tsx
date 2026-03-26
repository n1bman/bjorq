import { useState, useCallback } from 'react';
import { Monitor, Maximize, Minimize, Copy, Info, Shield, Eye } from 'lucide-react';
import { Button } from '../../ui/button';
import { Switch } from '../../ui/switch';
import { toast } from 'sonner';
import { useAppStore } from '../../../store/useAppStore';
import type { MarkerSize } from '../../../store/types';

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Kopierat!')).catch(() => {});
}

export default function DisplaySettings() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [showKioskHelp, setShowKioskHelp] = useState(false);
  const markerSize = useAppStore((s) => s.homeView.markerSize ?? 'medium');
  const setMarkerSize = (size: MarkerSize) => useAppStore.setState((s) => ({ homeView: { ...s.homeView, markerSize: size } }));

  const markerSizes: { key: MarkerSize; label: string }[] = [
    { key: 'small', label: 'S' },
    { key: 'medium', label: 'M' },
    { key: 'large', label: 'L' },
  ];

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      toast.error('Fullscreen stöds inte i denna miljö.');
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* App Mode */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
        <div className="flex items-center gap-2">
          <Monitor size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">App-läge</h3>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Starta webbläsaren med <code className="bg-secondary px-1 rounded">--app</code> för en ren appkänsla utan adressfält.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground">Chrome / Edge (Windows)</span>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
              onClick={() => copyText('start chrome --app=http://localhost:3000')}>
              <Copy size={10} /> Kopiera
            </Button>
          </div>
          <code className="block text-[10px] bg-secondary/50 rounded p-2 text-muted-foreground break-all">
            start chrome --app=http://localhost:3000
          </code>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground">Chromium (Linux / RPi)</span>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
              onClick={() => copyText('chromium-browser --app=http://localhost:3000 --start-fullscreen')}>
              <Copy size={10} /> Kopiera
            </Button>
          </div>
          <code className="block text-[10px] bg-secondary/50 rounded p-2 text-muted-foreground break-all">
            chromium-browser --app=http://localhost:3000 --start-fullscreen
          </code>
        </div>
      </div>

      {/* Browser Fullscreen */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
        <div className="flex items-center gap-2">
          <Maximize size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Browser Fullscreen</h3>
        </div>

        <Button
          size="sm"
          variant={isFullscreen ? 'destructive' : 'default'}
          className="w-full h-9 text-xs gap-2"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <><Minimize size={14} /> Lämna Fullscreen</> : <><Maximize size={14} /> Gå Fullscreen</>}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Tryck <kbd className="bg-secondary px-1 rounded text-foreground">ESC</kbd> för att lämna fullscreen
        </p>
      </div>

      {/* Marker size */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Enhetsmärken</h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Storlek</span>
          <div className="flex gap-1">
            {markerSizes.map(({ key, label }) => (
              <Button key={key} size="sm" variant={markerSize === key ? 'default' : 'outline'}
                className="h-7 w-9 text-xs" onClick={() => setMarkerSize(key)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* OS Kiosk */}
      <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">OS Kiosk-läge</h3>
          <span className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">Info</span>
        </div>

        <Button size="sm" variant="outline" className="w-full h-8 text-[10px] gap-1"
          onClick={() => setShowKioskHelp(!showKioskHelp)}>
          <Info size={12} /> {showKioskHelp ? 'Dölj instruktioner' : 'Visa instruktioner'}
        </Button>

        {showKioskHelp && (
          <div className="space-y-2 text-[10px] text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground text-xs mb-1">Windows Kiosk</p>
              <p>Använd Inställningar → Konton → Assigned Access för att låsa till Chrome/Edge.</p>
              <p className="mt-0.5">Avsluta: <kbd className="bg-secondary px-1 rounded text-foreground">Ctrl+Alt+Del</kbd></p>
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs mb-1">Linux / Raspberry Pi</p>
              <code className="block bg-secondary/50 rounded p-2 break-all">
                chromium-browser --kiosk http://localhost:3000
              </code>
              <p className="mt-0.5">Avsluta: <kbd className="bg-secondary px-1 rounded text-foreground">Alt+F4</kbd></p>
            </div>
            <div className="border-t border-border pt-2">
              <p className="font-semibold text-foreground text-xs mb-1">Admin-tips</p>
              <p>Håll nere navigeringsfältet (längst ner) i 5 sekunder för att visa exit-tips i kiosk-läge.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
