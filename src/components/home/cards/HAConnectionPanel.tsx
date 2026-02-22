import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HAConnectionPanel() {
  const status = useAppStore((s) => s.homeAssistant.status);
  const wsUrl = useAppStore((s) => s.homeAssistant.wsUrl);
  const token = useAppStore((s) => s.homeAssistant.token);
  const entities = useAppStore((s) => s.homeAssistant.entities);

  const [localUrl, setLocalUrl] = useState(wsUrl || 'ws://homeassistant.local:8123/api/websocket');
  const [localToken, setLocalToken] = useState(token);

  const statusConfig = {
    disconnected: { label: 'Frånkopplad', color: 'text-muted-foreground', icon: WifiOff },
    connecting: { label: 'Ansluter...', color: 'text-yellow-400', icon: Wifi },
    connected: { label: 'Ansluten', color: 'text-green-400', icon: Wifi },
    error: { label: 'Fel', color: 'text-destructive', icon: AlertCircle },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  const handleConnect = () => {
    // Store the URL and token - actual WebSocket connection would be implemented later
    useAppStore.setState((s) => ({
      homeAssistant: {
        ...s.homeAssistant,
        wsUrl: localUrl,
        token: localToken,
        status: 'connecting',
      },
    }));
    // Simulate connection for now
    setTimeout(() => {
      useAppStore.setState((s) => ({
        homeAssistant: { ...s.homeAssistant, status: 'connected' },
      }));
    }, 1500);
  };

  const handleDisconnect = () => {
    useAppStore.setState((s) => ({
      homeAssistant: {
        ...s.homeAssistant,
        status: 'disconnected',
        entities: [],
        liveStates: {},
      },
    }));
  };

  return (
    <div className="glass-panel rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Home Assistant</h4>
        <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
          <StatusIcon size={14} />
          {cfg.label}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">WebSocket URL</label>
        <Input
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="ws://homeassistant.local:8123/api/websocket"
          className="h-8 text-xs bg-secondary/30"
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
        />
      </div>

      {status === 'disconnected' || status === 'error' ? (
        <Button onClick={handleConnect} size="sm" className="w-full text-xs">
          Anslut
        </Button>
      ) : (
        <Button onClick={handleDisconnect} variant="outline" size="sm" className="w-full text-xs">
          Koppla från
        </Button>
      )}

      {status === 'connected' && entities.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            Entiteter ({entities.length})
          </p>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {entities.slice(0, 20).map((e) => (
              <div key={e.entityId} className="text-xs text-muted-foreground truncate">
                {e.friendlyName || e.entityId}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
