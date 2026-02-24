import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HAConnectionPanel() {
  const status = useAppStore((s) => s.homeAssistant.status);
  const wsUrl = useAppStore((s) => s.homeAssistant.wsUrl);
  const token = useAppStore((s) => s.homeAssistant.token);
  const entities = useAppStore((s) => s.homeAssistant.entities);

  const [localUrl, setLocalUrl] = useState(wsUrl || 'ws://homeassistant.local:8123/api/websocket');
  const [localToken, setLocalToken] = useState(token);

  const { connect, disconnect } = useHomeAssistant();

  const statusConfig = {
    disconnected: { label: 'Frånkopplad', color: 'text-muted-foreground', icon: WifiOff },
    connecting: { label: 'Ansluter...', color: 'text-yellow-400', icon: RefreshCw },
    connected: { label: 'Ansluten', color: 'text-green-400', icon: Wifi },
    error: { label: 'Anslutningsfel', color: 'text-destructive', icon: AlertCircle },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const handleConnect = () => {
    connect(localUrl, localToken);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Home Assistant</h4>
        <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
          <StatusIcon size={14} className={status === 'connecting' ? 'animate-spin' : ''} />
          {cfg.label}
        </div>
      </div>

      {status === 'error' && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-2">
          Kunde inte ansluta. Kontrollera URL och token.
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">WebSocket URL</label>
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="ws://homeassistant.local:8123/api/websocket"
          className="h-8 text-xs bg-secondary/30"
          disabled={status === 'connecting' || status === 'connected'}
        />
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

      {status === 'connected' && (
        <div className="border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Entiteter ({entities.length})
          </p>
          {entities.length === 0 ? (
            <p className="text-xs text-muted-foreground">Hämtar entiteter...</p>
          ) : (
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {entities.slice(0, 30).map((e) => (
                <div key={e.entityId} className="text-xs text-muted-foreground truncate flex justify-between">
                  <span>{e.friendlyName || e.entityId}</span>
                  <span className="text-[10px] opacity-60">{e.state}</span>
                </div>
              ))}
              {entities.length > 30 && (
                <p className="text-[10px] text-muted-foreground">...och {entities.length - 30} till</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
