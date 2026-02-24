import { useState } from 'react';
import { Home, Cloud, Cpu, Zap, Bell, Video, User, Pencil, X, CalendarDays, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import DevicesSection from './cards/DevicesSection';
import LocationSettings from './cards/LocationSettings';
import HomeWidgetConfig from './cards/HomeWidgetConfig';
import HAConnectionPanel from './cards/HAConnectionPanel';
import ActivityFeed from './cards/ActivityFeed';
import SurveillancePanel from './cards/SurveillancePanel';
import ProfilePanel from './cards/ProfilePanel';
import CategoryCard from './cards/CategoryCard';
import CategoryManager from './cards/CategoryManager';
import CalendarWidget from './cards/CalendarWidget';
import type { DeviceKind, DeviceMarker } from '@/store/types';

type DashCategory = 'home' | 'weather' | 'calendar' | 'devices' | 'energy' | 'surveillance' | 'activity' | 'profile' | 'widgets';

const categories: { key: DashCategory; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'weather', label: 'Väder', icon: Cloud },
  { key: 'calendar', label: 'Kalender', icon: CalendarDays },
  { key: 'devices', label: 'Enheter', icon: Cpu },
  { key: 'energy', label: 'Energi', icon: Zap },
  { key: 'surveillance', label: 'Övervakning', icon: Video },
  { key: 'activity', label: 'Aktivitet', icon: Bell },
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'widgets', label: 'Widgets', icon: LayoutGrid },
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

const kindCategory: Record<DeviceKind, string> = {
  light: 'Ljus', switch: 'Ljus', sensor: 'Sensorer', climate: 'Klimat',
  vacuum: 'Hem', camera: 'Säkerhet', fridge: 'Vitvaror', oven: 'Vitvaror',
  washer: 'Vitvaror', 'garage-door': 'Säkerhet', 'door-lock': 'Säkerhet',
  'power-outlet': 'Ljus', media_screen: 'Media',
};

function HomeCategory() {
  const markers = useAppStore((s) => s.devices.markers);
  const customCategories = useAppStore((s) => s.customCategories);
  const moveDeviceToCategory = useAppStore((s) => s.moveDeviceToCategory);
  const reorderCategories = useAppStore((s) => s.reorderCategories);
  const [showManager, setShowManager] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingCatIndex, setDraggingCatIndex] = useState<number | null>(null);

  let entries: { key: string; label: string; catId?: string; devices: DeviceMarker[] }[];

  if (customCategories.length > 0) {
    const categorizedIds = new Set(customCategories.flatMap((c) => c.deviceIds));
    entries = customCategories
      .map((cat) => {
        const devices = cat.deviceIds
          .map((id) => markers.find((m) => m.id === id))
          .filter(Boolean) as DeviceMarker[];
        return { key: cat.id, label: `${cat.icon} ${cat.name}`, catId: cat.id, devices };
      })
      .filter((e) => e.devices.length > 0 || editMode);

    const uncategorized = markers.filter((m) => !categorizedIds.has(m.id));
    if (uncategorized.length > 0) {
      entries.push({ key: 'uncategorized', label: '⚙️ Övrigt', devices: uncategorized });
    }
  } else {
    const grouped: Record<string, DeviceMarker[]> = {};
    for (const m of markers) {
      const cat = m.userCategory || kindCategory[m.kind] || 'Övrigt';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(m);
    }
    entries = Object.entries(grouped).map(([label, devices]) => ({ key: label, label, devices }));
  }

  const handleDropDevice = (categoryId: string, deviceId: string) => {
    if (categoryId) moveDeviceToCategory(deviceId, categoryId);
  };

  const handleDropCategory = (targetIndex: number) => {
    if (draggingCatIndex !== null && draggingCatIndex !== targetIndex) {
      reorderCategories(draggingCatIndex, targetIndex);
    }
    setDraggingCatIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <ClockWidget />
        <WeatherWidget />
        <EnergyWidget />
      </div>

      <div className="flex justify-end gap-2">
        <Button size="sm" variant={editMode ? 'default' : 'outline'} className="h-7 text-[10px] gap-1"
          onClick={() => setEditMode(!editMode)}>
          {editMode ? <><X size={10} /> Klar</> : <><Pencil size={10} /> Redigera</>}
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          onClick={() => setShowManager(!showManager)}>
          {showManager ? 'Stäng' : 'Hantera kategorier'}
        </Button>
      </div>

      {editMode && (
        <p className="text-[10px] text-muted-foreground text-center animate-pulse">
          Dra enheter mellan kategorier · Dra kategorier för att omordna
        </p>
      )}

      {showManager && <CategoryManager />}

      {entries.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-auto">
          {entries.map((entry, index) => (
            <CategoryCard
              key={entry.key}
              category={entry.label}
              categoryId={entry.catId}
              devices={entry.devices}
              span={entry.devices.length >= 5}
              editMode={editMode}
              categoryIndex={index}
              onDropDevice={entry.catId ? (deviceId) => handleDropDevice(entry.catId!, deviceId) : undefined}
              onDragCategoryStart={() => setDraggingCatIndex(index)}
              onDropCategory={() => handleDropCategory(index)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">Inga enheter ännu</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Gå till Bygge → Enheter för att placera</p>
        </div>
      )}
    </div>
  );
}

function WeatherCategory() {
  return (
    <div className="space-y-4">
      <WeatherWidget />
      <LocationSettings />
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs text-muted-foreground">
          Väderprognosen synkas automatiskt med din plats.
          Aktivera "Live väder" för att synka med Open-Meteo.
        </p>
      </div>
    </div>
  );
}

function CalendarCategory() {
  return <CalendarWidget />;
}

function DevicesCategory() {
  const [kindFilter, setKindFilter] = useState<DeviceKind | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {deviceFilters.map(({ key, label, emoji }) => (
          <Button key={key} size="sm"
            variant={(key === 'all' && !kindFilter) || kindFilter === key ? 'default' : 'outline'}
            className="h-7 text-[10px] gap-1 shrink-0"
            onClick={() => setKindFilter(key === 'all' ? null : key as DeviceKind)}>
            <span>{emoji}</span>{label}
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

function ProfileSettingsCategory() {
  return (
    <div className="space-y-4">
      <ProfilePanel />
      <LocationSettings />
      <HAConnectionPanel />
    </div>
  );
}

function WidgetsCategory() {
  return <HomeWidgetConfig />;
}

const categoryContent: Record<DashCategory, React.FC> = {
  home: HomeCategory,
  weather: WeatherCategory,
  calendar: CalendarCategory,
  devices: DevicesCategory,
  energy: EnergyCategory,
  surveillance: SurveillancePanel,
  activity: ActivityFeed,
  profile: ProfileSettingsCategory,
  widgets: WidgetsCategory,
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

        <div className="flex-1 overflow-y-auto p-4 pb-28">
          <Content />
        </div>
      </div>
    </div>
  );
}
