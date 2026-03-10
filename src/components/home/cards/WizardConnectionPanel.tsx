import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Wand2, Wifi, WifiOff, AlertCircle, RefreshCw, Trash2, Package, PlugZap } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { testWizardConnection, fetchWizardCatalog, clearWizardCatalogCache } from '../../../lib/wizardClient';
import { toast } from 'sonner';

export default function WizardConnectionPanel() {
  const wizard = useAppStore((s) => s.wizard);
  const setWizard = useAppStore((s) => s.setWizard);

  const [localUrl, setLocalUrl] = useState(wizard.url || '');
  const [testing, setTesting] = useState(false);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Keep localUrl in sync if wizard.url changes externally (e.g. bootstrap restore)
  useEffect(() => {
    if (wizard.url && wizard.url !== localUrl) setLocalUrl(wizard.url);
  }, [wizard.url]);

  // Auto-fetch asset count when connected
  useEffect(() => {
    if (wizard.status === 'connected' && wizard.url) {
      fetchWizardCatalog().then(assets => setAssetCount(assets.length)).catch(() => setAssetCount(null));
    } else {
      setAssetCount(null);
    }
  }, [wizard.status, wizard.url]);

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
    setWizard({ url: localUrl.trim() });
    try {
      const result = await testWizardConnection();
      if (result.ok) {
        clearWizardCatalogCache();
        const assets = await fetchWizardCatalog(true);
        setAssetCount(assets.length);
        setWizard({ url: localUrl.trim(), status: 'connected', version: result.version, lastChecked: new Date().toISOString() });
        toast.success(`Wizard ansluten — ${assets.length} assets${result.version ? ` (v${result.version})` : ''}`);
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

  const handleReconnect = useCallback(async () => {
    if (!wizard.url) return;
    setTesting(true);
    try {
      const result = await testWizardConnection();
      if (result.ok) {
        clearWizardCatalogCache();
        const assets = await fetchWizardCatalog(true);
        setAssetCount(assets.length);
        setWizard({ status: 'connected', version: result.version, lastChecked: new Date().toISOString() });
        toast.success(`Wizard återansluten — ${assets.length} assets`);
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
  }, [wizard.url, setWizard]);

  const handleRefreshCatalog = useCallback(async () => {
    setRefreshing(true);
    try {
      clearWizardCatalogCache();
      const assets = await fetchWizardCatalog(true);
      setAssetCount(assets.length);
      toast.success(`Katalog uppdaterad — ${assets.length} assets`);
    } catch {
      toast.error('Kunde inte hämta katalog');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setWizard({ url: '', status: 'disconnected', version: undefined, lastChecked: undefined });
    setLocalUrl('');
    setAssetCount(null);
    clearWizardCatalogCache();
    toast.success('Wizard-konfiguration återställd');
  }, [setWizard]);

  const isConnected = wizard.status === 'connected';

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
          {isConnected && wizard.version && (
            <span className="text-[10px] text-muted-foreground ml-1">(v{wizard.version})</span>
          )}
        </div>
      </div>

      {isConnected && assetCount !== null && (
        <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1.5">
          <Package size={14} className="text-primary" />
          <span className="text-xs text-foreground font-medium">{assetCount} assets tillgängliga</span>
        </div>
      )}

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
          URL till Wizard add-on. T.ex. http://&lt;HA-IP&gt;:3500
        </p>
      </div>

      {/* Action buttons — mirrors HA panel pattern */}
      {!isConnected ? (
        <Button onClick={handleTest} size="sm" className="w-full text-xs gap-1" disabled={!localUrl.trim() || testing}>
          <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Testar...' : 'Testa anslutning'}
        </Button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleReconnect} size="sm" variant="outline" className="text-xs gap-1" disabled={testing}>
            <PlugZap size={12} className={testing ? 'animate-spin' : ''} />
            Reconnect
          </Button>
          <Button onClick={handleRefreshCatalog} size="sm" variant="outline" className="text-xs gap-1" disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={handleReset} size="sm" variant="outline" className="text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10">
            <Trash2 size={12} />
            Reset
          </Button>
        </div>
      )}

      {wizard.status === 'error' && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
          Kunde inte ansluta. Kontrollera URL och att Wizard-tjänsten körs.
        </div>
      )}

      {isConnected && wizard.lastChecked && (
        <p className="text-[10px] text-muted-foreground">
          Senast testad: {new Date(wizard.lastChecked).toLocaleString('sv-SE')}
        </p>
      )}
    </div>
  );
}
