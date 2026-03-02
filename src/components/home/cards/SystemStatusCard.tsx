import { Info } from 'lucide-react';
import { getMode } from '../../../lib/apiClient';

export default function SystemStatusCard() {
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
