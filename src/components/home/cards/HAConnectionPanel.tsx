import { useState, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { useHomeAssistant, haServiceCaller } from '../../../hooks/useHomeAssistant';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Wifi, WifiOff, AlertCircle, RefreshCw, RotateCcw, ListRestart, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { isHostedSync, saveConfig, fetchHAStates } from '../../../lib/apiClient';
import { toast } from 'sonner';
import type { HAEntity } from '../../../store/types';

export default function HAConnectionPanel() {
  const status = useAppStore((s) => s.homeAssistant.status);
  const wsUrl = useAppStore((s) => s.homeAssistant.wsUrl);
  const token = useAppStore((s) => s.homeAssistant.token);
  const entities = useAppStore((s) => s.homeAssistant.entities);

  const [localUrl, setLocalUrl] = useState(wsUrl || '');
  const [localToken, setLocalToken] = useState(token);
  const [reloading, setReloading] = useState(false);

  const { connect, disconnect } = useHomeAssistant();

  const statusConfig = {
    disconnected: { label: 'Frånkopplad', color: 'text-muted-foreground', icon: WifiOff },
    connecting: { label: 'Ansluter...', color: 'text-yellow-400', icon: RefreshCw },
    connected: { label: 'Ansluten', color: 'text-green-400', icon: Wifi },
    error: { label: 'Anslutningsfel', color: 'text-destructive', icon: AlertCircle },
    degraded: { label: 'Degraderad', color: 'text-yellow-500', icon: AlertCircle },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const handleConnect = async () => {
    if (isHostedSync()) {
      try {
        await saveConfig({ ha: { baseUrl: localUrl, token: localToken } });
      } catch (err) {
        console.warn('[HA] Failed to save config to server:', err);
      }
    }
    connect(localUrl, localToken);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // B1: Reconnect — disconnect then reconnect with stored credentials
  const handleReconnect = useCallback(() => {
    const { wsUrl: url, token: tok } = useAppStore.getState().homeAssistant;
    if (!url && !isHostedSync()) {
      toast.error('Ingen HA-URL sparad');
      return;
    }
    disconnect();
    setTimeout(() => {
      if (isHostedSync()) {
        // In hosted mode, just reload page to re-trigger polling
        window.location.reload();
      } else {
        connect(url, tok);
      }
    }, 500);
    toast.info('Återansluter till Home Assistant…');
  }, [connect, disconnect]);

  // B1: Reload entities — re-fetch all states without full reconnect
  const handleReloadEntities = useCallback(async () => {
    setReloading(true);
    try {
      if (isHostedSync()) {
        // Hosted: re-fetch via REST
        const states = await fetchHAStates();
        if (Array.isArray(states)) {
          const s = useAppStore.getState();
          const mapped: HAEntity[] = states.map((e: any) => ({
            entityId: e.entity_id,
            domain: e.entity_id.split('.')[0],
            friendlyName: e.attributes?.friendly_name || e.entity_id,
            state: e.state,
            attributes: e.attributes || {},
          }));
          s.setHAEntities(mapped);
          for (const e of states) {
            s.updateHALiveState(e.entity_id, e.state, e.attributes || {});
          }
          toast.success(`${mapped.length} entiteter omladdade ✅`);
        }
      } else {
        // WebSocket: send get_states command
        // The easiest way is to disconnect and reconnect
        handleReconnect();
        return;
      }
    } catch (err) {
      toast.error('Kunde inte ladda om entiteter');
      console.error('[HA] Reload entities failed:', err);
    } finally {
      setReloading(false);
    }
  }, [handleReconnect]);

  // B1: Reset HA config — clear stored credentials and disconnect
  const handleResetConfig = useCallback(async () => {
    disconnect();
    useAppStore.setState((s) => ({
      homeAssistant: {
        ...s.homeAssistant,
        wsUrl: '',
        token: '',
        status: 'disconnected',
        entities: [],
        liveStates: {},
        vacuumSegmentMap: {},
      },
    }));
    setLocalUrl('');
    setLocalToken('');
    haServiceCaller.current = null;

    if (isHostedSync()) {
      try {
        await saveConfig({ ha: { baseUrl: '', token: '' } });
      } catch { /* non-critical */ }
    }

    toast.success('HA-konfiguration återställd');
  }, [disconnect]);

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Home Assistant</h4>
        <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
          <StatusIcon size={14} className={status === 'connecting' ? 'animate-spin' : ''} />
          {cfg.label}
          {status === 'connected' && (
            <span className="text-[10px] text-muted-foreground ml-1">
              ({entities.length} entiteter)
            </span>
          )}
        </div>
      </div>

      {isHostedSync() && (
        <p className="text-[10px] text-muted-foreground bg-secondary/30 rounded-lg p-2">
          🔒 Token sparas säkert på servern — aldrig i webbläsaren.
        </p>
      )}

      {status === 'error' && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2 space-y-1">
          <p>Kunde inte ansluta. Kontrollera URL och token.</p>
          {localUrl.startsWith('ws://') && (
            <p className="font-medium">⚠️ Använd wss:// istället för ws:// (krävs på HTTPS).</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">WebSocket URL</label>
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="wss://xxxxxxxx.ui.nabu.casa"
          className="h-8 text-xs bg-secondary/30"
          disabled={status === 'connecting' || status === 'connected'}
        />
        <p className="text-[10px] text-muted-foreground">
          Tips: Klistra in din Nabu Casa-URL (t.ex. wss://xxx.ui.nabu.casa). /api/websocket läggs till automatiskt.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Token</label>
        <Input
          type="password"
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          placeholder="Long-lived access token"
          className="h-8 text-xs bg-secondary/30"
          disabled={status === 'connecting' || status === 'connected'}
        />
      </div>

      {status === 'disconnected' || status === 'error' ? (
        <Button onClick={handleConnect} size="sm" className="w-full text-xs" disabled={!localUrl || !localToken}>
          Anslut
        </Button>
      ) : status === 'connecting' ? (
        <Button disabled size="sm" className="w-full text-xs">
          Ansluter...
        </Button>
      ) : (
        <Button onClick={handleDisconnect} variant="outline" size="sm" className="w-full text-xs">
          Koppla från
        </Button>
      )}

      {/* B1: Action buttons — Reconnect / Reload / Reset */}
      {(status === 'connected' || status === 'error') && (
        <div className="border-t border-border/50 pt-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Åtgärder</p>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1 flex-col py-1"
              onClick={handleReconnect}
            >
              <RotateCcw size={12} />
              Reconnect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1 flex-col py-1"
              onClick={handleReloadEntities}
              disabled={reloading}
            >
              <ListRestart size={12} className={reloading ? 'animate-spin' : ''} />
              {reloading ? 'Laddar…' : 'Reload'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px] gap-1 flex-col py-1 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={handleResetConfig}
            >
              <Trash2 size={12} />
              Reset
            </Button>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div className="border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Entiteter ({entities.length})
          </p>
          {entities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Hämtar entiteter...</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-0.5 pr-3">
                {entities.slice(0, 50).map((e) => (
                  <div key={e.entityId} className="text-xs text-muted-foreground truncate flex justify-between">
                    <span>{e.friendlyName || e.entityId}</span>
                    <span className="text-[10px] opacity-60">{e.state}</span>
                  </div>
                ))}
                {entities.length > 50 && (
                  <p className="text-[10px] text-muted-foreground">...och {entities.length - 50} till</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
