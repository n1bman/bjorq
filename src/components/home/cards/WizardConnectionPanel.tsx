import { useState, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Wand2, Wifi, WifiOff, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { testWizardConnection, clearWizardCatalogCache } from '../../../lib/wizardClient';
import { toast } from 'sonner';

export default function WizardConnectionPanel() {
  const wizard = useAppStore((s) => s.wizard);
  const setWizard = useAppStore((s) => s.setWizard);

  const [localUrl, setLocalUrl] = useState(wizard.url || '');
  const [testing, setTesting] = useState(false);

  const statusConfig = {
    disconnected: { label: 'Frånkopplad', color: 'text-muted-foreground', icon: WifiOff },
    connected: { label: 'Ansluten', color: 'text-green-400', icon: Wifi },
    error: { label: 'Anslutningsfel', color: 'text-destructive', icon: AlertCircle },
  };

  const cfg = statusConfig[wizard.status];
  const StatusIcon = cfg.icon;

  const handleTest = useCallback(async () => {
    if (!localUrl.trim()) { toast.error('Ange Wizard URL'); return; }
    setTesting(true);
    // Temporarily set URL so wizardClient can use it
    setWizard({ url: localUrl.trim() });
    try {
      const result = await testWizardConnection();
      if (result.ok) {
        setWizard({ url: localUrl.trim(), status: 'connected', version: result.version, lastChecked: new Date().toISOString() });
        clearWizardCatalogCache();
        toast.success(`Wizard ansluten${result.version ? ` (v${result.version})` : ''}`);
      } else {
        setWizard({ status: 'error' });
        toast.error('Kunde inte ansluta till Wizard');
      }
    } catch {
      setWizard({ status: 'error' });
      toast.error('Kunde inte ansluta till Wizard');
    } finally {
      setTesting(false);
    }
  }, [localUrl, setWizard]);

  const handleReset = useCallback(() => {
    setWizard({ url: '', status: 'disconnected', version: undefined, lastChecked: undefined });
    setLocalUrl('');
    clearWizardCatalogCache();
    toast.success('Wizard-konfiguration återställd');
  }, [setWizard]);

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Asset Wizard</h4>
        </div>
        <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
          <StatusIcon size={14} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Testar...' : cfg.label}
          {wizard.status === 'connected' && wizard.version && (
            <span className="text-[10px] text-muted-foreground ml-1">(v{wizard.version})</span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Anslut till BJORQ Asset Wizard för att använda Wizard-assets i möbelpanelen.
      </p>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Wizard URL</label>
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="http://homeassistant.local:3500"
          className="h-8 text-xs bg-secondary/30"
          disabled={testing}
        />
        <p className="text-[10px] text-muted-foreground">
          URL till Wizard add-on. T.ex. http://&lt;HA-IP&gt;:8099
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleTest} size="sm" className="flex-1 text-xs gap-1" disabled={!localUrl.trim() || testing}>
          <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Testar...' : 'Testa anslutning'}
        </Button>
        {wizard.status !== 'disconnected' && (
          <Button onClick={handleReset} size="sm" variant="outline" className="text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
            <Trash2 size={12} />
            Återställ
          </Button>
        )}
      </div>

      {wizard.status === 'error' && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
          Kunde inte ansluta. Kontrollera URL och att Wizard-tjänsten körs.
        </div>
      )}

      {wizard.status === 'connected' && wizard.lastChecked && (
        <p className="text-[10px] text-muted-foreground">
          Senast testad: {new Date(wizard.lastChecked).toLocaleString('sv-SE')}
        </p>
      )}
    </div>
  );
}
