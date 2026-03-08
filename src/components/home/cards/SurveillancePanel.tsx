import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Camera, Eye, Video, X, Bell } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { useCameraSnapshot } from '../../../hooks/useCameraSnapshot';
import type { DeviceMarker, CameraState } from '../../../store/types';

/* ── Per-camera card (isolates snapshot hook per camera) ── */
function CameraCard({ cam, isOn, onClick }: { cam: DeviceMarker; isOn: boolean; onClick: () => void }) {
  const deviceState = useAppStore((s) => s.devices.deviceStates[cam.id]);
  const entityId = (deviceState?.kind === 'camera' ? (deviceState.data as CameraState).entityId : undefined) || cam.ha?.entityId;
  const snapshotUrl = useCameraSnapshot(entityId, isOn);

  return (
    <div
      className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
      onClick={onClick}
    >
      <div className="relative aspect-video bg-black/60 flex items-center justify-center">
        {snapshotUrl ? (
          <img src={snapshotUrl} alt={cam.name || 'Kamera'} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Camera size={32} className="text-muted-foreground/30" />
        )}
        <div className={cn(
          'absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium',
          isOn ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', isOn ? 'bg-green-400 animate-pulse' : 'bg-destructive')} />
          {isOn ? 'Live' : 'Offline'}
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-foreground truncate">{cam.name || 'Kamera'}</p>
        <p className="text-xs text-muted-foreground">{isOn ? 'Ansluten' : 'Ej ansluten'}</p>
      </div>
    </div>
  );
}

/* ── Expanded camera view ── */
function ExpandedCamera({ cam, isOn, onClose }: { cam: DeviceMarker; isOn: boolean; onClose: () => void }) {
  const deviceState = useAppStore((s) => s.devices.deviceStates[cam.id]);
  const entityId = (deviceState?.kind === 'camera' ? (deviceState.data as CameraState).entityId : undefined) || cam.ha?.entityId;
  const snapshotUrl = useCameraSnapshot(entityId, isOn);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
      <div className="relative aspect-video bg-black/80 flex items-center justify-center">
        {snapshotUrl ? (
          <img src={snapshotUrl} alt={cam.name || 'Kamera'} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Video size={48} className="text-muted-foreground/20" />
        )}
        <div className={cn(
          'absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold',
          isOn ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
        )}>
          <span className={cn('w-2 h-2 rounded-full', isOn ? 'bg-green-400 animate-pulse' : 'bg-destructive')} />
          {isOn ? 'LIVE' : 'OFFLINE'}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>
      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{cam.name || 'Kamera'}</p>
          <p className="text-xs text-muted-foreground">{isOn ? 'Uppdateras var 5:e sekund' : 'Ej ansluten'}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1">
          <Bell size={10} /> Notiser
        </Button>
      </div>
    </div>
  );
}

export default function SurveillancePanel() {
  const cameras = useAppStore((s) => s.devices.markers.filter((m) => m.kind === 'camera'));
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const activityLog = useAppStore((s) => s.activityLog.filter((e) => e.category === 'device' && e.deviceId && cameras.some((c) => c.id === e.deviceId)).slice(0, 10));
  const motionSensors = useAppStore((s) =>
    s.devices.markers.filter((m) => {
      const st = s.devices.deviceStates[m.id];
      return m.kind === 'sensor' && st?.kind === 'sensor' && st.data.sensorType === 'motion';
    })
  );

  const [expandedCam, setExpandedCam] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

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
    <div className="space-y-3">
      {/* Expanded camera view */}
      {expandedCam && (() => {
        const cam = cameras.find((c) => c.id === expandedCam);
        if (!cam) return null;
        const state = deviceStates[cam.id];
        const isOn = state && 'on' in state.data ? (state.data as any).on : true;
        return <ExpandedCamera cam={cam} isOn={isOn} onClose={() => setExpandedCam(null)} />;
      })()}

      {/* Camera grid */}
      <div className="grid grid-cols-2 gap-3">
        {cameras.map((cam) => {
          const state = deviceStates[cam.id];
          const isOn = state && 'on' in state.data ? (state.data as any).on : true;
          if (cam.id === expandedCam) return null;

          return (
            <CameraCard
              key={cam.id}
              cam={cam}
              isOn={isOn}
              onClick={() => setExpandedCam(cam.id)}
            />
          );
        })}
      </div>

      {/* Motion sensor summary */}
      {motionSensors.length > 0 && (
        <div className="glass-panel rounded-2xl p-4">
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

      {/* Camera activity log */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Kameralogg</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowLog(!showLog)}>
            {showLog ? 'Dölj' : 'Visa'}
          </Button>
        </div>
        {showLog && (
          <div className="space-y-1 mt-2">
            {activityLog.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60">Inga kamerahändelser loggade</p>
            ) : (
              activityLog.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate flex-1">{e.title}</span>
                  <span className="text-muted-foreground/50 shrink-0 ml-2">
                    {new Date(e.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
