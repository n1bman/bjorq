import { useAppStore } from '../../../store/useAppStore';
import type { MediaState, SpeakerState } from '../../../store/types';
import { Tv, Music, Play, Pause, Square, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Slider } from '../../ui/slider';
import { cn } from '../../../lib/utils';

/**
 * Dashboard widget that shows media players with artwork, title, and controls.
 */
export default function MediaScreenWidget() {
  const markers = useAppStore((s) => s.devices.markers);
  const deviceStates = useAppStore((s) => s.devices.deviceStates);
  const liveStates = useAppStore((s) => s.homeAssistant.liveStates);
  const haStatus = useAppStore((s) => s.homeAssistant.status);
  const updateDeviceState = useAppStore((s) => s.updateDeviceState);

  const mediaDevices = markers.filter((m) =>
    ['media_screen', 'speaker', 'soundbar'].includes(m.kind)
  );

  if (mediaDevices.length === 0) return null;

  return (
    <div className="space-y-3">
      {mediaDevices.map((m) => {
        const state = deviceStates[m.id];
        if (!state) return null;

        const entityId = m.ha?.entityId;
        const live = entityId ? liveStates[entityId] : undefined;
        const attrs = live?.attributes ?? {};

        // Get artwork URL
        let artworkUrl: string | null = null;
        if (haStatus === 'connected' && entityId) {
          const pic = (attrs.entity_picture ?? attrs.media_image_url) as string | undefined;
          if (pic) {
            const isHosted = useAppStore.getState()._hostedMode;
            if (isHosted) {
              artworkUrl = `/api/ha${pic.startsWith('/') ? '' : '/'}${pic}`;
            } else {
              const wsUrl = useAppStore.getState().homeAssistant.wsUrl;
              const baseUrl = wsUrl.replace(/^ws/, 'http').replace(/\/api\/websocket$/, '');
              artworkUrl = `${baseUrl}${pic}`;
            }
          }
        }

        const appName = attrs.app_name as string | undefined;
        const isScreen = state.kind === 'media_screen';
        const _isSpeaker = state.kind === 'speaker' || state.kind === 'soundbar';
        const data = state.data as MediaState | SpeakerState;
        const isOn = data.on;
        const isPlaying = data.state === 'playing';
        const title = isScreen ? (data as MediaState).title : (data as SpeakerState).mediaTitle;
        const artist = isScreen ? (data as MediaState).artist : undefined;
        const source = isScreen ? (data as MediaState).source : (data as SpeakerState).source;
        const volume = data.volume;

        return (
          <div key={m.id} className="glass-panel rounded-2xl overflow-hidden">
            {/* Artwork / header */}
            <div className={cn(
              'relative h-28 flex items-end p-3',
              isOn ? 'bg-gradient-to-br from-primary/20 to-secondary' : 'bg-muted'
            )}>
              {artworkUrl && isOn && (
                <img
                  src={artworkUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="relative z-10 flex items-center gap-2 w-full">
                {isScreen ? <Tv size={16} className="text-primary shrink-0" /> : <Music size={16} className="text-primary shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{title || m.name || m.kind}</p>
                  {artist && <p className="text-[10px] text-muted-foreground truncate">{artist}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {appName && <span className="text-[9px] text-primary/70">{appName}</span>}
                    {source && <span className="text-[9px] text-muted-foreground">{source}</span>}
                  </div>
                </div>
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', isOn ? 'bg-green-400' : 'bg-muted-foreground/30')} />
              </div>
            </div>

            {/* Controls */}
            {isOn && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-center gap-1">
                  {isScreen && (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0"
                      onClick={() => updateDeviceState(m.id, { _action: 'previous' })}>
                      <SkipBack size={14} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-10 w-10 p-0"
                    onClick={() => updateDeviceState(m.id, { state: isPlaying ? 'paused' : 'playing' })}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </Button>
                  {isScreen && (
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0"
                      onClick={() => updateDeviceState(m.id, { _action: 'next' })}>
                      <SkipForward size={14} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0"
                    onClick={() => updateDeviceState(m.id, { state: 'idle' })}>
                    <Square size={12} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 size={12} className="text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.02}
                    onValueChange={([v]) => updateDeviceState(m.id, { volume: v })}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
