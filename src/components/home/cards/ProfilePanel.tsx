import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Palette, Monitor } from 'lucide-react';

const themes = [
  { key: 'dark' as const, label: 'Mörkt' },
  { key: 'midnight' as const, label: 'Midnatt' },
  { key: 'light' as const, label: 'Ljust' },
];

const accents = [
  { color: '#f59e0b', label: 'Guld' },
  { color: '#3b82f6', label: 'Blå' },
  { color: '#10b981', label: 'Grön' },
  { color: '#ef4444', label: 'Röd' },
  { color: '#8b5cf6', label: 'Lila' },
];

const backgrounds = [
  { key: 'scene3d' as const, label: '3D-vy' },
  { key: 'gradient' as const, label: 'Gradient' },
  { key: 'solid' as const, label: 'Enfärgad' },
];

export default function ProfilePanel() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  return (
    <div className="space-y-5">
      {/* Name */}
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <User size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Profil</span>
        </div>
        <Input
          value={profile.name}
          onChange={(e) => setProfile({ name: e.target.value })}
          placeholder="Ditt namn"
          className="h-8 text-sm"
        />
      </div>

      {/* Theme */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Tema</span>
        </div>
        <div className="flex gap-2">
          {themes.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={profile.theme === key ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs"
              onClick={() => setProfile({ theme: key })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Accentfärg</span>
        </div>
        <div className="flex gap-3 justify-center">
          {accents.map(({ color, label }) => (
            <button
              key={color}
              title={label}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-transform',
                profile.accentColor === color ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              onClick={() => setProfile({ accentColor: color })}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <span className="text-xs font-semibold text-foreground">Bakgrund</span>
        <div className="flex gap-2">
          {backgrounds.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={profile.dashboardBg === key ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs"
              onClick={() => setProfile({ dashboardBg: key })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
