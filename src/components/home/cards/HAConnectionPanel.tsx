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
  const hosted = isHostedSync();

  const { connect, disconnect } = useHomeAssistant();

  const statusConfig = {
    disconnected: { label: 'Frånkopplad', color: 'text-muted-foreground', icon: WifiOff },
    connecting: { label: 'Ansluter...', color: 'text-yellow-400', icon: RefreshCw },
    connected: { label: 'Ansluten', color: 'text-green-400', icon: Wifi },
    error: { label: 'Anslutningsfel', color: 'text-destructive', icon: AlertCircle },
    degraded: { label: 'Degraderad', color: 'text-yellow-500', icon: AlertCircle },
  } as const;

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const clearHAState = useCallback(() => {
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
  }, []);

  const handleConnect = async () => {
    if (hosted) {
      try {
        await saveConfig({ ha: { baseUrl: localUrl, token: localToken } });
        useAppStore.setState((s) => ({
          homeAssistant: {
            ...s.homeAssistant,
            wsUrl: localUrl,
            token: localToken,
            status: 'connecting',
          },
        }));
        toast.info('Sparat. Laddar om BJORQ för att starta HA-sync...');
        window.location.reload();
        return;
      } catch (err) {
        console.warn('[HA] Failed to save config to server:', err);
        toast.error('Kunde inte spara HA-konfigurationen');
        return;
      }
    }

    connect(localUrl, localToken);
  };

  const handleDisconnect = async () => {
    if (hosted) {
      try {
        await saveConfig({ ha: { baseUrl: '', token: '' } });
      } catch (err) {
        console.warn('[HA] Failed to clear hosted config:', err);
      }
      clearHAState();
      toast.success('HA-kopplingen återställd');
      return;
    }

    disconnect();
  };

  const handleReconnect = useCallback(() => {
    const { wsUrl: url, token: tok } = useAppStore.getState().homeAssistant;
    if (!url && !hosted) {
      toast.error('Ingen HA-URL sparad');
      return;
    }

    disconnect();
    setTimeout(() => {
      if (hosted) {
        window.location.reload();
      } else {
        connect(url, tok);
      }
    }, 500);
    toast.info('Återansluter till Home Assistant...');
  }, [connect, disconnect, hosted]);

  const handleReloadEntities = useCallback(async () => {
    setReloading(true);
    try {
      if (hosted) {
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
          toast.success(`${mapped.length} entiteter omladdade`);
        }
      } else {
        handleReconnect();
        return;
      }
    } catch (err) {
      toast.error('Kunde inte ladda om entiteter');
      console.error('[HA] Reload entities failed:', err);
    } finally {
      setReloading(false);
    }
  }, [handleReconnect, hosted]);

  const handleResetConfig = useCallback(async () => {
    disconnect();
    clearHAState();

    if (hosted) {
      try {
        await saveConfig({ ha: { baseUrl: '', token: '' } });
      } catch {
        // non-critical
      }
    }

    toast.success('HA-konfiguration återställd');
  }, [clearHAState, disconnect, hosted]);

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Home Assistant</h4>
        <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
          <StatusIcon size={14} className={status === 'connecting' ? 'animate-spin' : ''} />
          {cfg.label}
          {status === 'connected' && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({entities.length} entiteter)
            </span>
          )}
        </div>
      </div>

      {hosted && (
        <p className="rounded-lg bg-secondary/30 p-2 text-[10px] text-muted-foreground">
          Token sparas säkert på servern, aldrig i webbläsaren.
        </p>
      )}

      {status === 'error' && (
        <div className="space-y-1 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
          <p>Kunde inte ansluta. Kontrollera URL och token.</p>
          {localUrl.startsWith('ws://') && (
            <p className="font-medium">Använd wss:// i stället för ws:// på HTTPS.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Home Assistant URL</label>
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="http://homeassistant.local:8123 eller https://xxx.ui.nabu.casa"
          className="h-8 bg-secondary/30 text-xs"
          disabled={!hosted && (status === 'connecting' || status === 'connected')}
        />
        <p className="text-[10px] text-muted-foreground">
          Ange din Home Assistant-URL, inte BJORQ-porten. `/api/websocket` läggs till automatiskt.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Access Token</label>
        <Input
          type="password"
          value={localToken}
          onChange={(e) => setLocalToken(e.target.value)}
          placeholder="Long-lived access token"
          className="h-8 bg-secondary/30 text-xs"
          disabled={!hosted && (status === 'connecting' || status === 'connected')}
        />
      </div>

      {status === 'disconnected' || status === 'error' ? (
        <Button onClick={handleConnect} size="sm" className="w-full text-xs" disabled={!localUrl || !localToken}>
          Anslut
        </Button>
      ) : status === 'connecting' ? (
        <Button
          onClick={hosted ? handleDisconnect : undefined}
          disabled={!hosted}
          variant={hosted ? 'outline' : 'default'}
          size="sm"
          className="w-full text-xs"
        >
          {hosted ? 'Avbryt anslutning' : 'Ansluter...'}
        </Button>
      ) : (
        <Button onClick={handleDisconnect} variant="outline" size="sm" className="w-full text-xs">
          Koppla från
        </Button>
      )}

      {(status === 'connected' || status === 'error' || (hosted && status === 'connecting')) && (
        <div className="space-y-1.5 border-t border-border/50 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Åtgärder</p>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-col gap-1 py-1 text-[10px]"
              onClick={handleReconnect}
            >
              <RotateCcw size={12} />
              Reconnect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-col gap-1 py-1 text-[10px]"
              onClick={handleReloadEntities}
              disabled={reloading}
            >
              <ListRestart size={12} className={reloading ? 'animate-spin' : ''} />
              {reloading ? 'Laddar...' : 'Reload'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-col gap-1 border-destructive/30 py-1 text-[10px] text-destructive hover:bg-destructive/10"
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
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Entiteter ({entities.length})
          </p>
          {entities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Hämtar entiteter...</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-0.5 pr-3">
                {entities.slice(0, 50).map((e) => (
                  <div key={e.entityId} className="flex justify-between truncate text-xs text-muted-foreground">
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
