import ClockWidget from './cards/ClockWidget';
import WeatherWidget from './cards/WeatherWidget';
import EnergyWidget from './cards/EnergyWidget';
import DevicesSection from './cards/DevicesSection';
import LocationSettings from './cards/LocationSettings';
import HomeWidgetConfig from './cards/HomeWidgetConfig';

export default function DashboardGrid() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="relative w-full h-full p-4 flex flex-col gap-6 overflow-y-auto pointer-events-auto">
        {/* Top row: Clock, Weather, Energy */}
        <div className="flex items-start gap-3 flex-wrap">
          <ClockWidget />
          <WeatherWidget />
          <EnergyWidget />
        </div>

        {/* Devices section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Enheter</h3>
          <DevicesSection />
        </div>

        {/* Settings section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Inställningar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LocationSettings />
            <HomeWidgetConfig />
          </div>
        </div>
      </div>
    </div>
  );
}
