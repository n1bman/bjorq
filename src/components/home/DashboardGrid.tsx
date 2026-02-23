import { useState } from 'react';
import { Home, Cloud, Cpu, Zap, Settings, Wifi, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/useAppStore';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import DevicesSection from './cards/DevicesSection';
import LocationSettings from './cards/LocationSettings';
import HomeWidgetConfig from './cards/HomeWidgetConfig';
import HAConnectionPanel from './cards/HAConnectionPanel';
import ActivityFeed from './cards/ActivityFeed';
import type { DeviceKind } from '@/store/types';

type DashCategory = 'home' | 'weather' | 'devices' | 'energy' | 'activity' | 'settings' | 'ha';

const categories: { key: DashCategory; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'weather', label: 'Väder', icon: Cloud },
  { key: 'devices', label: 'Enheter', icon: Cpu },
  { key: 'energy', label: 'Energi', icon: Zap },
  { key: 'activity', label: 'Aktivitet', icon: Bell },
  { key: 'settings', label: 'Inställningar', icon: Settings },
  { key: 'ha', label: 'HA', icon: Wifi },
];

const deviceFilters: { key: DeviceKind | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Alla', emoji: '🏠' },
  { key: 'light', label: 'Ljus', emoji: '💡' },
  { key: 'climate', label: 'Klimat', emoji: '❄️' },
  { key: 'media_screen', label: 'Media', emoji: '📺' },
  { key: 'vacuum', label: 'Robot', emoji: '🤖' },
  { key: 'door-lock', label: 'Lås', emoji: '🔒' },
  { key: 'sensor', label: 'Sensor', emoji: '🌡️' },
];

function HomeCategory() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <ClockWidget />
        <WeatherWidget />
        <EnergyWidget />
      </div>
      <DevicesSection groupBy="category" />
    </div>
  );
}

function WeatherCategory() {
  return (
    <div className="space-y-4">
      <WeatherWidget />
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs text-muted-foreground">
          Detaljerad väderprognos med timvis data kommer snart.
          Aktivera "Live väder" under Inställningar för att synka med din plats.
        </p>
      </div>
    </div>
  );
}

function DevicesCategory() {
  const [kindFilter, setKindFilter] = useState<DeviceKind | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {deviceFilters.map(({ key, label, emoji }) => (
          <Button
            key={key}
            size="sm"
            variant={(key === 'all' && !kindFilter) || kindFilter === key ? 'default' : 'outline'}
            className="h-7 text-[10px] gap-1 shrink-0"
            onClick={() => setKindFilter(key === 'all' ? null : key as DeviceKind)}
          >
            <span>{emoji}</span>
            {label}
          </Button>
        ))}
      </div>
      <DevicesSection filter={kindFilter} />
    </div>
  );
}

function EnergyCategory() {
  return (
    <div className="space-y-3">
      <EnergyWidget />
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Solpaneler</h4>
        <p className="text-xs text-muted-foreground">Anslut dina solpaneler via Home Assistant för att se produktion och förbrukning i realtid.</p>
      </div>
      <div className="glass-panel rounded-2xl p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Förbrukning</h4>
        <p className="text-xs text-muted-foreground">Energiförbrukningsdata visas här när Home Assistant är ansluten.</p>
      </div>
    </div>
  );
}

function ActivityCategory() {
  return <ActivityFeed />;
}

function SettingsCategory() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <LocationSettings />
      <HomeWidgetConfig />
    </div>
  );
}

function HACategory() {
  return <HAConnectionPanel />;
}

const categoryContent: Record<DashCategory, React.FC> = {
  home: HomeCategory,
  weather: WeatherCategory,
  devices: DevicesCategory,
  energy: EnergyCategory,
  activity: ActivityCategory,
  settings: SettingsCategory,
  ha: HACategory,
};

export default function DashboardGrid() {
  const [active, setActive] = useState<DashCategory>('home');
  const unreadCount = useAppStore((s) => s.activityLog.filter((e) => !e.read).length);
  const Content = categoryContent[active];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="relative w-full h-full flex flex-col pointer-events-auto">
        <div className="flex items-center gap-1 px-3 py-2 bg-card/80 backdrop-blur-sm border-b border-border overflow-x-auto flex-nowrap shrink-0">
          {categories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all min-w-[52px]',
                active === key
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === 'activity' && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Content />
        </div>
      </div>
    </div>
  );
}
