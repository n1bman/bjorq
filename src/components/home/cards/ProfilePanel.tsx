import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { User, MapPin, Info, Wifi, Music, Mail } from 'lucide-react';
import { isHostedSync } from '../../../lib/apiClient';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export default function ProfilePanel() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const location = useAppStore((s) => s.environment.location);
  const haStatus = useAppStore((s) => s.homeAssistant.status);

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
            placeholder="Ditt namn"
            className="h-8 text-sm font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Info size={9} />
              v{APP_VERSION}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <MapPin size={9} />
              {location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°
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

      {/* Connected accounts */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kopplade konton</span>
        <div className="space-y-1.5">
          <AccountRow
            icon={<Wifi size={13} />}
            label="Home Assistant"
            status={haStatus === 'connected' ? 'Ansluten' : haStatus === 'connecting' ? 'Ansluter...' : 'Ej ansluten'}
            connected={haStatus === 'connected'}
          />
          <AccountRow
            icon={<Music size={13} />}
            label="Spotify"
            status="Ej kopplad"
            connected={false}
          />
          <AccountRow
            icon={<Mail size={13} />}
            label="E-post / Kalender"
            status="Ej kopplad"
            connected={false}
          />
        </div>
      </div>
    </div>
  );
}

function AccountRow({ icon, label, status, connected }: {
  icon: React.ReactNode;
  label: string;
  status: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-secondary/20">
      <span className={connected ? 'text-primary' : 'text-muted-foreground/50'}>{icon}</span>
      <span className="text-xs text-foreground flex-1">{label}</span>
      <span className={`text-[10px] ${connected ? 'text-primary' : 'text-muted-foreground/60'}`}>
        {status}
      </span>
    </div>
  );
}
