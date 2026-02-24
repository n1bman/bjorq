import { useAppStore } from '@/store/useAppStore';
import { Camera, Wifi, WifiOff, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SurveillancePanel() {
  const cameras = useAppStore((s) => s.devices.markers.filter((m) => m.kind === 'camera'));
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const motionSensors = useAppStore((s) =>
    s.devices.markers.filter((m) => {
      const st = s.devices.deviceStates[m.id];
      return m.kind === 'sensor' && st?.kind === 'sensor' && st.data.sensorType === 'motion';
    })
  );

  if (cameras.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera size={40} className="mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Inga kameror placerade</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Gå till Bygge → Enheter för att lägga till kameror</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cameras.map((cam) => {
        const state = deviceStates[cam.id];
        const isOn = state && 'on' in state.data ? (state.data as any).on : true;

        return (
          <div key={cam.id} className="glass-panel rounded-2xl overflow-hidden">
            {/* Camera feed placeholder */}
            <div className="relative aspect-video bg-black/60 flex items-center justify-center">
              <Camera size={32} className="text-muted-foreground/30" />
              <div className={cn(
                'absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium',
                isOn ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
              )}>
                {isOn ? <Wifi size={8} /> : <WifiOff size={8} />}
                {isOn ? 'Live' : 'Offline'}
              </div>
            </div>
            {/* Info */}
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">{cam.name || 'Kamera'}</p>
              <p className="text-[10px] text-muted-foreground">
                {isOn ? 'Ansluten' : 'Ej ansluten'}
              </p>
            </div>
          </div>
        );
      })}

      {/* Motion sensor summary */}
      {motionSensors.length > 0 && (
        <div className="col-span-2 glass-panel rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Rörelsesensorer</span>
          </div>
          <div className="space-y-1">
            {motionSensors.map((s) => {
              const st = deviceStates[s.id];
              const detected = st?.kind === 'sensor' && st.data.value > 0;
              return (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className={detected ? 'text-amber-400' : 'text-muted-foreground/50'}>
                    {detected ? 'Rörelse!' : 'Lugnt'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
