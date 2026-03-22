import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '../../../store/useAppStore';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  User,
  MapPin,
  Info,
  Wifi,
  Music,
  Mail,
  Shield,
  Lock,
  LockOpen,
  KeyRound,
} from 'lucide-react';
import { isHostedSync } from '../../../lib/apiClient';
import { useAdminAuth } from '../../../hooks/useAdminAuth';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export default function ProfilePanel() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const location = useAppStore((s) => s.environment.location);
  const haStatus = useAppStore((s) => s.homeAssistant.status);
  const hosted = isHostedSync();
  const { status, loading, setup, login, logout, changePin } = useAdminAuth();

  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [busy, setBusy] = useState(false);

  const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMessage);
      setPin('');
      setCurrentPin('');
      setNextPin('');
    } catch (err: any) {
      toast.error(err?.message || 'Atgarden misslyckades');
    } finally {
      setBusy(false);
    }
  };

  const authLabel = !hosted
    ? 'Lokal utvecklingsmiljo'
    : loading
      ? 'Kontrollerar...'
      : !status.configured
        ? 'Ingen PIN satt'
        : status.unlocked
          ? 'Adminlage upplast'
          : 'Adminlage last';

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
            placeholder="Ditt namn"
            className="h-8 border-none bg-transparent px-0 text-sm font-semibold focus-visible:ring-0"
          />
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Info size={9} />
              v{APP_VERSION}
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <MapPin size={9} />
              {location.lat.toFixed(1)}°, {location.lon.toFixed(1)}°
            </span>
            {hosted && (
              <>
                <span>·</span>
                <span className="text-primary">Hosted</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Profil & atkomst
          </span>
          <span
            className={`text-[10px] font-medium ${
              hosted && status.configured && !status.unlocked ? 'text-amber-500' : 'text-muted-foreground'
            }`}
          >
            {authLabel}
          </span>
        </div>

        <div className="space-y-1.5">
          <AccountRow
            icon={<Shield size={13} />}
            label="Adminskydd"
            status={authLabel}
            connected={!hosted || !status.configured || status.unlocked}
          />
        </div>

        {!hosted ? (
          <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 text-[10px] text-muted-foreground">
            Inloggning anvands bara i hosted- och add-on-laget. I lokal utveckling ar adminskydd avstangt.
          </div>
        ) : !status.configured ? (
          <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
            <p className="text-[10px] text-muted-foreground">
              Satt en admin-PIN for att skydda Home Assistant, backup, projektdata och andra kansliga installningar.
            </p>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ny admin-PIN"
              className="h-8 bg-background/50 text-xs"
            />
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={busy || pin.trim().length < 4}
              onClick={() => runAction(() => setup(pin.trim()), 'Admin-PIN skapad')}
            >
              <Lock size={14} /> Aktivera adminskydd
            </Button>
          </div>
        ) : !status.unlocked ? (
          <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
            <p className="text-[10px] text-muted-foreground">
              Las upp adminlaget for att kunna andra installningar, Home Assistant och dataverktyg.
            </p>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Admin-PIN"
              className="h-8 bg-background/50 text-xs"
            />
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={busy || pin.trim().length < 4}
              onClick={() => runAction(() => login(pin.trim()), 'Adminlage upplast')}
            >
              <LockOpen size={14} /> Logga in som admin
            </Button>
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
              <KeyRound size={13} className="text-primary" />
              Adminlaget ar upplast
            </div>
            <p className="text-[10px] text-muted-foreground">
              Om PIN gloms bort kan du rensa security.pinHash och security.pinSalt i serverns config.json och starta om
              BJORQ.
            </p>
            <Input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Nuvarande PIN"
              className="h-8 bg-background/50 text-xs"
            />
            <Input
              type="password"
              value={nextPin}
              onChange={(e) => setNextPin(e.target.value)}
              placeholder="Ny PIN"
              className="h-8 bg-background/50 text-xs"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={busy || currentPin.trim().length < 4 || nextPin.trim().length < 4}
                onClick={() => runAction(() => changePin(currentPin.trim(), nextPin.trim()), 'Admin-PIN uppdaterad')}
              >
                <Shield size={14} /> Byt PIN
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={busy}
                onClick={() => runAction(() => logout(), 'Adminlage last')}
              >
                <Lock size={14} /> Logga ut admin
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kopplade konton</span>
        <div className="space-y-1.5">
          <AccountRow
            icon={<Wifi size={13} />}
            label="Home Assistant"
            status={haStatus === 'connected' ? 'Ansluten' : haStatus === 'connecting' ? 'Ansluter...' : 'Ej ansluten'}
            connected={haStatus === 'connected'}
          />
          <AccountRow icon={<Music size={13} />} label="Spotify" status="Ej kopplad" connected={false} />
          <AccountRow icon={<Mail size={13} />} label="E-post / Kalender" status="Ej kopplad" connected={false} />
        </div>
      </div>
    </div>
  );
}

function AccountRow({
  icon,
  label,
  status,
  connected,
}: {
  icon: ReactNode;
  label: string;
  status: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/20 px-2 py-1.5">
      <span className={connected ? 'text-primary' : 'text-muted-foreground/50'}>{icon}</span>
      <span className="flex-1 text-xs text-foreground">{label}</span>
      <span className={`text-[10px] ${connected ? 'text-primary' : 'text-muted-foreground/60'}`}>{status}</span>
    </div>
  );
}
