import { useState, useMemo, useRef } from 'react';
import { Home, Cloud, Cpu, Zap, Bell, Video, Settings, Pencil, X, CalendarDays, Bot, Moon, Save, Workflow, Palette, LayoutGrid, Thermometer, Trees, User, Monitor, Database, Link2, Sparkles } from 'lucide-react';
import WeatherHomeImpact from './cards/WeatherHomeImpact';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useAppStore } from '../../store/useAppStore';
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
import DeviceControlCard from './cards/DeviceControlCard';

import GraphicsSettings from './cards/GraphicsSettings';
import SunWeatherPanel from './cards/SunWeatherPanel';
import EnvironmentPanel from './cards/EnvironmentPanel';
import DisplaySettings from './cards/DisplaySettings';
import WifiPanel from './cards/WifiPanel';
import WizardConnectionPanel from './cards/WizardConnectionPanel';
import AutomationsPanel from './cards/AutomationsPanel';
import ScenesPanel from './cards/ScenesPanel';
import ClimateTab from './cards/ClimateTab';
import DashboardPreview3D from './DashboardPreview3D';
import type { PreviewCameraState } from './DashboardPreview3D';
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
  { key: 'settings', label: 'Inställningar', icon: Settings },
  { key: 'profile', label: 'Profil', icon: User },
];

const deviceFilters: { key: DeviceKind | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'Alla', emoji: '🏠' },
  { key: 'light', label: 'Ljus', emoji: '💡' },
  { key: 'light-fixture', label: 'Armaturer', emoji: '💡' },
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
  'light-fixture': 'Ljus', 'smart-outlet': 'Ljus',
  egg: 'Hem',
};

/** Light-type device kinds that should be grouped by room */
const LIGHT_KINDS: Set<DeviceKind> = new Set(['light', 'switch', 'power-outlet', 'light-fixture', 'smart-outlet']);

function HomeCategory() {
  const markers = useAppStore((s) => s.devices.markers);
  const floors = useAppStore((s) => s.layout.floors);
  const customCategories = useAppStore((s) => s.customCategories);
  const moveDeviceToCategory = useAppStore((s) => s.moveDeviceToCategory);
  const reorderCategories = useAppStore((s) => s.reorderCategories);
  const saveHomeStartCamera = useAppStore((s) => s.saveHomeStartCamera);
  const [showManager, setShowManager] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingCatIndex, setDraggingCatIndex] = useState<number | null>(null);
  const [showSaveView, setShowSaveView] = useState(false);
  const [kindFilter, setKindFilter] = useState<DeviceKind | null>(null);
  const previewCamRef = useRef<PreviewCameraState>({ position: [10, 12, 10], target: [0, 0, 0] });

  const roomNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const floor of floors) {
      for (const room of floor.rooms) {
        map[room.id] = room.name || 'Rum';
      }
    }
    return map;
  }, [floors]);

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
    const lightsByRoom: Record<string, DeviceMarker[]> = {};
    const otherByKind: Record<string, DeviceMarker[]> = {};

    for (const m of markers) {
      if (LIGHT_KINDS.has(m.kind)) {
        const roomName = m.roomId ? (roomNameMap[m.roomId] || 'Rum') : 'Övrigt';
        const key = `💡 ${roomName}`;
        if (!lightsByRoom[key]) lightsByRoom[key] = [];
        lightsByRoom[key].push(m);
      } else {
        const cat = m.userCategory || kindCategory[m.kind] || 'Övrigt';
        if (!otherByKind[cat]) otherByKind[cat] = [];
        otherByKind[cat].push(m);
      }
    }

    entries = [
      ...Object.entries(lightsByRoom).map(([label, devices]) => ({ key: label, label, devices })),
      ...Object.entries(otherByKind).map(([label, devices]) => ({ key: label, label, devices })),
    ];
  }

  // Apply device kind filter
  const filteredEntries = kindFilter
    ? entries.map((e) => ({
        ...e,
        devices: e.devices.filter((d) => d.kind === kindFilter),
      })).filter((e) => e.devices.length > 0)
    : entries;

  const handleDropDevice = (categoryId: string, deviceId: string) => {
    if (categoryId) moveDeviceToCategory(deviceId, categoryId);
  };

  const handleDropCategory = (targetIndex: number) => {
    if (draggingCatIndex !== null && draggingCatIndex !== targetIndex) {
      reorderCategories(draggingCatIndex, targetIndex);
    }
    setDraggingCatIndex(null);
  };

  const density = useAppStore((s) => s.dashboard.density ?? 'balance');
  const setDashboardDensity = useAppStore((s) => s.setDashboardDensity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="label-micro">Bjorq Home / Nordic Noir</p>
          <h2 className="text-xl font-semibold text-foreground font-display mt-1">Hem, översatt från nuvarande dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 text-[11px]"
            onClick={() => setShowManager(!showManager)}>
            {showManager ? 'Stäng' : 'Hantera kategorier'}
          </Button>
          <Button size="sm" variant={editMode ? 'default' : 'ghost'} className="h-8 text-[11px] gap-1"
            onClick={() => setEditMode(!editMode)}>
            {editMode ? <><X size={11} /> Klar</> : <><Pencil size={11} /> Redigera</>}
          </Button>
        </div>
      </div>

      {showManager && <CategoryManager />}

      {/* 3D Hero Preview */}
      <div>
        <p className="label-micro mb-2">Home Overview</p>
        <p className="text-[13px] text-muted-foreground/60 mb-3">Samma hemvy, men mer lugn och materialitet</p>
        <div
          className="rounded-[28px] overflow-hidden h-[280px] relative cursor-pointer
            border border-[hsl(var(--glass-border)/0.12)]
            shadow-[0_24px_60px_hsl(220_20%_4%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.03)]"
          onDoubleClick={() => setShowSaveView(true)}
        >
          <DashboardPreview3D className="absolute inset-0" cameraStateRef={previewCamRef} />
          {/* Overlay text on 3D */}
          <div className="absolute bottom-4 left-5 z-10">
            <p className="text-[10px] text-foreground/40 font-medium tracking-wider uppercase">Plan • status</p>
          </div>
          {showSaveView && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
              <div className="nn-widget p-6 w-72 shadow-xl space-y-4">
                <p className="text-base font-semibold text-foreground font-display">Spara som startvy?</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">Den aktuella kameravinkeln sparas som din kontrollpanelvy.</p>
                <div className="flex gap-3">
                  <Button size="sm" variant="outline" className="flex-1 h-10" onClick={() => setShowSaveView(false)}>Avbryt</Button>
                  <Button size="sm" className="flex-1 h-10 gap-1.5" onClick={() => {
                    saveHomeStartCamera(previewCamRef.current.position, previewCamRef.current.target);
                    setShowSaveView(false);
                  }}>
                    <Save size={13} /> Spara
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {deviceFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setKindFilter(key === 'all' ? null : key as DeviceKind)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all shrink-0 border',
              (key === 'all' && !kindFilter) || kindFilter === key
                ? 'bg-foreground/10 text-foreground border-[hsl(var(--border)/0.3)]'
                : 'text-muted-foreground/60 hover:text-foreground border-transparent hover:border-[hsl(var(--border)/0.15)]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Room/category cards — two-column grid */}
      <div className={cn(
        'grid gap-5',
        density === 'calm' ? 'grid-cols-1 lg:grid-cols-2' :
        density === 'dense' ? 'grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 lg:grid-cols-2'
      )}>
        {filteredEntries.map((entry, index) => (
          <CategoryCard
            key={entry.key}
            category={entry.label}
            categoryId={entry.catId}
            devices={entry.devices}
            span={false}
            editMode={editMode}
            categoryIndex={index}
            onDropDevice={entry.catId ? (deviceId) => handleDropDevice(entry.catId!, deviceId) : undefined}
            onDragCategoryStart={() => setDraggingCatIndex(index)}
            onDropCategory={() => handleDropCategory(index)}
          />
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-base text-muted-foreground font-display">Inga enheter ännu</p>
          <p className="text-[13px] text-muted-foreground/50 max-w-sm mx-auto leading-relaxed">
            Gå till Design → Inredning → Enheter för att placera enheter i ditt hem
          </p>
        </div>
      )}
    </div>
  );
}

function WeatherCategory() {
  return (
    <div className="space-y-4">
      <WeatherWidget expanded />
      <WeatherHomeImpact />
      <div className="glass-panel rounded-2xl p-4">
        <p className="text-xs text-muted-foreground">
          Väderprognosen synkas automatiskt med din plats.
          Aktivera "Live väder" för att synka med Open-Meteo.
          Ändra plats under Inställningar → Plats.
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

      {/* 3D Camera preview */}
      <div className="rounded-xl overflow-hidden h-[200px] border border-border/40 bg-card">
        <DashboardPreview3D />
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

function SettingsWorkspaceCategory() {
  const settingsSections = [
    { id: 'settings-look', label: 'Utseende', icon: Palette, description: 'Tema och visuell profil' },
    { id: 'settings-display', label: 'Skarm & Standby', icon: Monitor, description: 'Kiosk, fullscreen och standby' },
    { id: 'settings-graphics', label: 'Grafik & Preview', icon: Sparkles, description: '3D-preview, rendering och kvalitet' },
    { id: 'settings-environment', label: 'Miljo & Vader', icon: Trees, description: 'Sol, vader, terrang och atmosfar' },
    { id: 'settings-system', label: 'System', icon: Cpu, description: 'Driftlage, status och serverinfo' },
  ] as const;

  return (
    <WorkspaceLayout
      eyebrow="Installningar"
      title="Kontrollcenter"
      sections={settingsSections}
    >
      <WorkspaceSection
        id="settings-look"
        title="Utseende"
      >
        <div className="workspace-grid workspace-grid-single">
          <ThemeCard />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="settings-display"
        title="Skarm & Standby"
      >
        <div className="workspace-grid">
          <DisplaySettings />
          <StandbySettingsPanel />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="settings-graphics"
        title="Grafik & 3D-preview"
      >
        <div className="workspace-grid">
          <div className="workspace-preview-shell">
            <div className="workspace-preview-stage">
              <DashboardPreview3D />
            </div>
          </div>
          <GraphicsSettings />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="settings-environment"
        title="Miljo & Vader"
      >
        <div className="workspace-grid">
          <SunWeatherPanel />
          <EnvironmentPanel />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="settings-system"
        title="System"
      >
        <div className="workspace-grid workspace-grid-single">
          <SystemStatusCard />
        </div>
      </WorkspaceSection>
    </WorkspaceLayout>
  );
}

function ProfileWorkspaceCategory() {
  const profileSections = [
    { id: 'profile-account', label: 'Konto', icon: User, description: 'Profil, adminlage och identitet' },
    { id: 'profile-connections', label: 'Kopplingar', icon: Link2, description: 'Synk, integrationer och natverk' },
    { id: 'profile-data', label: 'Data', icon: Database, description: 'Projekt, backup, export och import' },
  ] as const;

  return (
    <WorkspaceLayout
      eyebrow="Profil"
      title="Konto & synk"
      sections={profileSections}
    >
      <WorkspaceSection
        id="profile-account"
        title="Konto & sakerhet"
      >
        <div className="workspace-grid workspace-grid-single">
          <ProfilePanel />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="profile-connections"
        title="Kopplingar & synk"
      >
        <div className="workspace-grid">
          <HAConnectionPanel />
          <WizardConnectionPanel />
          <LocationSettings />
          <WifiPanel />
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        id="profile-data"
        title="Data & backup"
      >
        <div className="workspace-grid">
          <ProjectManagerPanel />
          <DataBackupCard />
        </div>
      </WorkspaceSection>
    </WorkspaceLayout>
  );
}

function WorkspaceLayout({
  eyebrow,
  title,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  sections: readonly { id: string; label: string; icon: typeof Home; description: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-shell">
      <div className="workspace-header">
        <div className="workspace-header-copy">
          <span className="workspace-eyebrow">{eyebrow}</span>
          <h2 className="workspace-title">{title}</h2>
        </div>
        <div className="workspace-nav-panel">
          <div className="workspace-nav-title">Snabblankar</div>
          <nav className="workspace-nav-list">
            {sections.map(({ id, label, icon: Icon }) => (
              <a key={id} href={`#${id}`} className="workspace-nav-chip">
                <Icon size={13} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="workspace-content">{children}</div>
    </div>
  );
}

function WorkspaceSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="workspace-section scroll-mt-24">
      <div className="workspace-section-head">
        <div>
          <span className="workspace-section-kicker">Sektion</span>
          <h3 className="workspace-section-title">{title}</h3>
        </div>
      </div>
      {children}
    </section>
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
  settings: SettingsWorkspaceCategory,
  profile: ProfileWorkspaceCategory,
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
