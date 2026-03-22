import { useState } from 'react';
import { Bell, Camera, Eye, Video, X } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { useCameraSnapshot } from '../../../hooks/useCameraSnapshot';
import type { DeviceMarker, CameraState } from '../../../store/types';
import { getSurveillanceEntityViews, type HAEntityView } from '../../../lib/haMenuSelectors';

function CameraCard({ title, entityId, isOn, snapshotHint, onClick, linkedLabel }: { title: string; entityId?: string; isOn: boolean; snapshotHint?: string; onClick: () => void; linkedLabel: string }) {
  const snapshotUrl = useCameraSnapshot(entityId, isOn, snapshotHint);

  return (
    <div className="glass-panel cursor-pointer overflow-hidden rounded-2xl transition-all hover:ring-1 hover:ring-primary/30" onClick={onClick}>
      <div className="relative aspect-video bg-black/60 flex items-center justify-center">
        {snapshotUrl ? <img src={snapshotUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" /> : <Camera size={32} className="text-muted-foreground/30" />}
        <div className={cn('absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-medium flex items-center gap-1', isOn ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isOn ? 'bg-green-400 animate-pulse' : 'bg-destructive')} />
          {isOn ? 'Live' : 'Offline'}
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{linkedLabel}</p>
      </div>
    </div>
  );
}

function ExpandedCamera({ title, entityId, isOn, snapshotHint, onClose }: { title: string; entityId?: string; isOn: boolean; snapshotHint?: string; onClose: () => void }) {
  const snapshotUrl = useCameraSnapshot(entityId, isOn, snapshotHint);

  return (
    <div className="glass-panel animate-fade-in overflow-hidden rounded-2xl">
      <div className="relative aspect-video bg-black/80 flex items-center justify-center">
        {snapshotUrl ? <img src={snapshotUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" /> : <Video size={48} className="text-muted-foreground/20" />}
        <Button size="sm" variant="ghost" className="absolute right-2 top-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{isOn ? 'Snapshot uppdateras automatiskt' : 'Kameran rapporterar inte live just nu'}</p>
        </div>
      </div>
    </div>
  );
}

function resolveCameraState(view: HAEntityView) {
  const marker = view.marker as DeviceMarker | undefined;
  const deviceState = view.deviceState?.kind === 'camera' ? view.deviceState.data as CameraState : undefined;
  return {
    title: marker?.name || view.entity.friendlyName || 'Kamera',
    entityId: deviceState?.entityId || marker?.ha?.entityId || view.entity.entityId,
    isOn: deviceState ? deviceState.on : view.entity.state !== 'off' && view.entity.state !== 'unavailable',
    snapshotHint: deviceState?.lastSnapshot || (typeof view.entity.attributes.entity_picture === 'string' ? view.entity.attributes.entity_picture : undefined),
    linkedLabel: view.linked ? `Lankad till ${marker?.name || 'enhet'}` : 'Ej placerad i design',
  };
}

export default function SurveillancePanel() {
  const { cameras, motionSensors } = useAppStore(getSurveillanceEntityViews);
  const activityLog = useAppStore((s) => s.activityLog.filter((entry) => entry.category === 'device').slice(0, 10));
  const [expandedCam, setExpandedCam] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  if (cameras.length === 0) {
    return (
      <div className="py-12 text-center">
        <Camera size={40} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Inga kameror hittades i Home Assistant</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Nar du kopplar kameror i HA kommer de visas har, och placering i design ger dessutom 3D-kontext.</p>
      </div>
    );
  }

  const expanded = expandedCam ? cameras.find((camera) => camera.entity.entityId === expandedCam) : null;

  return (
    <div className="space-y-3">
      {expanded && <ExpandedCamera {...resolveCameraState(expanded)} onClose={() => setExpandedCam(null)} />}

      <div className="grid grid-cols-2 gap-3">
        {cameras.map((camera) => {
          if (camera.entity.entityId === expandedCam) return null;
          return <CameraCard key={camera.entity.entityId} {...resolveCameraState(camera)} onClick={() => setExpandedCam(camera.entity.entityId)} />;
        })}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2">
          <Eye size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Rorelsesensorer</span>
          <span className="text-[10px] text-muted-foreground">({motionSensors.length})</span>
        </div>
        {motionSensors.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70">Inga motion-sensorer hittades i HA.</p>
        ) : (
          <div className="space-y-1">
            {motionSensors.map(({ entity, linked, marker }) => (
              <div key={entity.entityId} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="truncate text-foreground">{entity.friendlyName}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">{linked && marker ? `· ${marker.name}` : '· Ej länkad'}</span>
                </div>
                <span className={entity.state === 'on' ? 'text-amber-400' : 'text-muted-foreground/50'}>
                  {entity.state === 'on' ? 'Rorelse!' : 'Lugnt'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Overvakningslogg</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowLog((v) => !v)}>
            {showLog ? 'Dolj' : 'Visa'}
          </Button>
        </div>
        {showLog && (
          <div className="mt-2 space-y-1">
            {activityLog.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60">Inga overvakningshandelser loggade</p>
            ) : (
              activityLog.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-[11px]">
                  <span className="flex-1 truncate text-muted-foreground">{entry.title}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground/50">{new Date(entry.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
