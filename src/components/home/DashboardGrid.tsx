import { useState } from 'react';
import { Home, Cloud, Cpu, Zap, Bell, Video, Settings, Pencil, X, CalendarDays, Bot, Moon, Save, Workflow, Palette, LayoutGrid, Thermometer, Trees } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useAppStore } from '../../store/useAppStore';
import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import EnergyDeviceList from './cards/EnergyDeviceList';
import DevicesSection from './cards/DevicesSection';
import MediaScreenWidget from './cards/MediaScreenWidget';
import LocationSettings from './cards/LocationSettings';
import HomeWidgetConfig from './cards/HomeWidgetConfig';
import HAConnectionPanel from './cards/HAConnectionPanel';
import ActivityFeed from './cards/ActivityFeed';
import SurveillancePanel from './cards/SurveillancePanel';
import ProfilePanel from './cards/ProfilePanel';
import ThemeCard from './cards/ThemeCard';
import DataBackupCard from './cards/DataBackupCard';
import ProjectManagerPanel from './cards/ProjectManagerPanel';
import SystemStatusCard from './cards/SystemStatusCard';
import CategoryCard from './cards/CategoryCard';
import CategoryManager from './cards/CategoryManager';
import CalendarWidget from './cards/CalendarWidget';
import RobotPanel from './cards/RobotPanel';
import CameraStartSettings from './cards/CameraStartSettings';
import GraphicsSettings from './cards/GraphicsSettings';
import SunWeatherPanel from './cards/SunWeatherPanel';
import EnvironmentPanel from './cards/EnvironmentPanel';
import DisplaySettings from './cards/DisplaySettings';
import WifiPanel from './cards/WifiPanel';
import WizardConnectionPanel from './cards/WizardConnectionPanel';
import WifiWidget from './cards/WifiWidget';
import AutomationsPanel from './cards/AutomationsPanel';
import ScenesPanel from './cards/ScenesPanel';
import ScenesWidget from './cards/ScenesWidget';
import AutomationsWidget from './cards/AutomationsWidget';
import ClimateTab from './cards/ClimateTab';
import type { DeviceKind, DeviceMarker, StandbyCameraView } from '../../store/types';
import { cameraRef } from '../../lib/cameraRef';

import type { DashCategory } from '../../store/types';

export const categories: { key: DashCategory; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Hem', icon: Home },
  { key: 'weather', label: 'Väder', icon: Cloud },
  { key: 'calendar', label: 'Kalender', icon: CalendarDays },
  { key: 'devices', label: 'Enheter', icon: Cpu },
  { key: 'energy', label: 'Energi', icon: Zap },
  { key: 'climate', label: 'Klimat', icon: Thermometer },
  { key: 'automations', label: 'Automation', icon: Workflow },
  { key: 'scenes', label: 'Scener', icon: Palette },
  { key: 'surveillance', label: 'Övervakning', icon: Video },
  { key: 'robot', label: 'Robot', icon: Bot },
  { key: 'activity', label: 'Aktivitet', icon: Bell },
  { key: 'widgets', label: 'Widgets', icon: LayoutGrid },
  { key: 'graphics', label: 'Grafik & Miljö', icon: Trees },
  { key: 'settings', label: 'Inställningar', icon: Settings },
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
  fan: 'Klimat', cover: 'Hem', scene: 'Automation',
  alarm: 'Säkerhet', 'water-heater': 'Klimat', humidifier: 'Klimat',
  siren: 'Säkerhet', valve: 'Hem', remote: 'Media', 'lawn-mower': 'Hem',
  speaker: 'Media', soundbar: 'Media',
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
        <WifiWidget />
        <ScenesWidget />
        <AutomationsWidget />
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
          <p className="text-xs text-muted-foreground/60 mt-1">Gå till Design → Inredning → Enheter för att placera</p>
        </div>
      )}
    </div>
  );
}

function WeatherCategory() {
  return (
    <div className="space-y-4">
      <WeatherWidget expanded />
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs text-muted-foreground">
          Väderprognosen synkas automatiskt med din plats.
          Aktivera "Live väder" för att synka med Open-Meteo.
          Ändra plats under Inställningar → Plats.
          Nederbördseffekter i 3D hanteras under Grafik & Miljö.
        </p>
      </div>
    </div>
  );
}

function CalendarCategory() {
  return <CalendarWidget expanded />;
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
      {(!kindFilter || kindFilter === 'media_screen') && <MediaScreenWidget />}
    </div>
  );
}

function EnergyCategory() {
  return (
    <div className="space-y-3">
      <EnergyWidget alwaysExpanded />
      <EnergyDeviceList />
    </div>
  );
}

function StandbySettingsPanel() {
  const standby = useAppStore((s) => s.standby);
  const setStandbySettings = useAppStore((s) => s.setStandbySettings);
  const enterStandby = useAppStore((s) => s.enterStandby);

  const idleOptions = [
    { value: 0.5, label: '30 sek' },
    { value: 1, label: '1 min' },
    { value: 2, label: '2 min' },
    { value: 5, label: '5 min' },
  ];

  const cameraOptions: { value: StandbyCameraView; label: string }[] = [
    { value: 'standard', label: 'Standard' },
    { value: 'topdown', label: 'Ovanifrån' },
    { value: 'angled-left', label: 'Vinkel vänster' },
    { value: 'angled-right', label: 'Vinkel höger' },
    { value: 'close', label: 'Närbild' },
    ...(standby.customPos ? [{ value: 'custom' as StandbyCameraView, label: '📌 Sparad vy' }] : []),
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Moon size={18} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Standby-läge</h3>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Aktivera standby</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={standby.enabled}
            onChange={(e) => setStandbySettings({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Inaktivitetstid</span>
        <select
          value={standby.idleMinutes}
          onChange={(e) => setStandbySettings({ idleMinutes: Number(e.target.value) })}
          className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border"
        >
          {idleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Vio mode settings */}
      <div className="pt-2 border-t border-border/30 space-y-3">
        <h4 className="text-xs font-semibold text-foreground">Vio-läge (djup standby)</h4>
        <p className="text-[10px] text-muted-foreground">
          Efter standby-perioden övergår skärmen till Vio-läge: nästan svart, GPU pausad, minimal klocka.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Tid till Vio</span>
          <select
            value={standby.vioMinutes}
            onChange={(e) => setStandbySettings({ vioMinutes: Number(e.target.value) })}
            className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border"
          >
            <option value={0}>Av</option>
            <option value={1}>1 min</option>
            <option value={2}>2 min</option>
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={30}>30 min</option>
          </select>
        </div>

        {/* Motion sensor entity picker */}
        <div className="space-y-1.5">
          <span className="text-sm text-foreground">Rörelsesensor (väck)</span>
          <p className="text-[10px] text-muted-foreground">Välj en rörelsesensor från HA som väcker skärmen automatiskt.</p>
          <MotionEntityPicker
            value={standby.motionEntityId}
            onChange={(id) => setStandbySettings({ motionEntityId: id })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Kameravy</span>
        <select
          value={standby.cameraView}
          onChange={(e) => setStandbySettings({ cameraView: e.target.value as any })}
          className="bg-secondary text-foreground text-sm rounded-lg px-3 py-1.5 border border-border"
        >
          {cameraOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        className="w-full h-9 text-xs gap-2"
        onClick={() => {
          const pos: [number, number, number] = [cameraRef.position.x, cameraRef.position.y, cameraRef.position.z];
          const target: [number, number, number] = [cameraRef.target.x, cameraRef.target.y, cameraRef.target.z];
          setStandbySettings({ customPos: pos, customTarget: target, cameraView: 'custom' });
        }}
      >
        <Save size={14} />
        Spara aktuell kameravy
      </Button>

      <Button
        variant="outline"
        className="w-full h-10"
        onClick={() => enterStandby()}
      >
        Förhandsgranska Standby
      </Button>
    </div>
  );
}

function MotionEntityPicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const entities = useAppStore((s) => s.homeAssistant.entities);
  const haStatus = useAppStore((s) => s.homeAssistant.status);

  const motionSensors = entities.filter((e) =>
    e.domain === 'binary_sensor' &&
    (e.attributes.device_class === 'motion' || /motion|rörelse/i.test(e.entityId))
  );

  if (haStatus !== 'connected' || motionSensors.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground/60">
        {haStatus !== 'connected' ? 'Anslut HA för att välja sensor' : 'Inga rörelsesensorer hittades'}
      </p>
    );
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="w-full bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 border border-border"
    >
      <option value="">Ingen (manuell väckning)</option>
      {motionSensors.map((s) => (
        <option key={s.entityId} value={s.entityId}>
          {s.friendlyName || s.entityId}
        </option>
      ))}
    </select>
  );
}

function WidgetsCategory() {
  return <HomeWidgetConfig />;
}

function SettingsCategory() {
  return (
    <div className="max-w-[1100px] mx-auto space-y-[var(--space-section)]">
      {/* Profil */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Profil</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ProfilePanel />
        </div>
      </section>

      {/* Utseende */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Utseende</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ThemeCard />
        </div>
      </section>

      {/* Skärm */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Skärm</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <DisplaySettings />
          <StandbySettingsPanel />
          <CameraStartSettings />
        </div>
      </section>


      {/* System */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">System</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <SystemStatusCard />
        </div>
      </section>

      {/* Anslutning */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Anslutning</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <HAConnectionPanel />
          <WizardConnectionPanel />
          <LocationSettings />
          <WifiPanel />
        </div>
      </section>

      {/* Data */}
      <section className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Data</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ProjectManagerPanel />
          <DataBackupCard />
        </div>
      </section>
    </div>
  );
}

function GraphicsCategory() {
  return (
    <div className="max-w-[700px] mx-auto space-y-4">
      <GraphicsSettings />
      <SunWeatherPanel />
      <EnvironmentPanel />
    </div>
  );
}

export const categoryContent: Record<DashCategory, React.FC> = {
  home: HomeCategory,
  weather: WeatherCategory,
  calendar: CalendarCategory,
  devices: DevicesCategory,
  energy: EnergyCategory,
  climate: ClimateTab,
  automations: AutomationsPanel,
  scenes: ScenesPanel,
  surveillance: SurveillancePanel,
  robot: RobotPanel,
  activity: ActivityFeed,
  widgets: WidgetsCategory,
  graphics: GraphicsCategory,
  settings: SettingsCategory,
};

export default function DashboardGrid() {
  const [active, setActive] = useState<DashCategory>('home');
  const unreadCount = useAppStore((s) => s.activityLog.filter((e) => !e.read).length);
  const Content = categoryContent[active];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="relative w-full h-full flex flex-col pointer-events-auto">
        <div className="flex items-center gap-1 px-3 py-2.5 bg-card/80 backdrop-blur-sm border-b border-border overflow-x-auto flex-nowrap shrink-0">
          {categories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-[11px] font-medium transition-all min-w-[64px]',
                active === key
                  ? 'bg-primary/15 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
              {key === 'activity' && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-28">
          <Content />
        </div>
      </div>
    </div>
  );
}
