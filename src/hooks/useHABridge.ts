import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { haServiceCaller } from './useHomeAssistant';
import type { DeviceState } from '@/store/types';

/**
 * Set of entityIds currently suppressed (we just sent a command, ignore HA echo).
 */
const suppressedEntities = new Set<string>();
const suppressTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * When true, deviceState changes originated from HA — bridge should NOT send commands back.
 */
let fromHA = false;

export function setFromHA(val: boolean) {
  fromHA = val;
}

export function isSuppressed(entityId: string): boolean {
  return suppressedEntities.has(entityId);
}

function suppressEntity(entityId: string, ms = 1500) {
  suppressedEntities.add(entityId);
  clearTimeout(suppressTimers[entityId]);
  suppressTimers[entityId] = setTimeout(() => {
    suppressedEntities.delete(entityId);
    delete suppressTimers[entityId];
  }, ms);
}

/**
 * Given a device state change, send the corresponding HA service call.
 */
function sendHACommand(entityId: string, state: DeviceState) {
  const callService = haServiceCaller.current;
  if (!callService) {
    console.warn('[HABridge] No callService available');
    return;
  }

  const domain = entityId.split('.')[0];
  suppressEntity(entityId);

  console.log('[HABridge] Sending command to', entityId, 'domain:', domain, 'state:', state.data);

  switch (domain) {
    case 'light': {
      const data = state.data as any;
      if (data.on) {
        const serviceData: Record<string, unknown> = { entity_id: entityId };
        if (typeof data.brightness === 'number') serviceData.brightness = data.brightness;
        if (data.colorMode === 'temp' && typeof data.colorTemp === 'number') {
          serviceData.color_temp = data.colorTemp;
        }
        if (data.colorMode === 'rgb' && Array.isArray(data.rgbColor)) {
          serviceData.rgb_color = data.rgbColor;
        }
        callService('light', 'turn_on', serviceData);
      } else {
        callService('light', 'turn_off', { entity_id: entityId });
      }
      break;
    }

    case 'switch':
    case 'input_boolean': {
      const on = (state.data as any).on;
      callService(domain, on ? 'turn_on' : 'turn_off', { entity_id: entityId });
      break;
    }

    case 'climate': {
      const data = state.data as any;
      if (!data.on) {
        callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: 'off' });
      } else {
        if (data.mode) {
          callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: data.mode });
        }
        if (typeof data.targetTemp === 'number') {
          callService('climate', 'set_temperature', { entity_id: entityId, temperature: data.targetTemp });
        }
      }
      break;
    }

    case 'lock': {
      const locked = (state.data as any).locked;
      callService('lock', locked ? 'lock' : 'unlock', { entity_id: entityId });
      break;
    }

    case 'vacuum': {
      const data = state.data as any;
      if (data.status === 'cleaning') {
        callService('vacuum', 'start', { entity_id: entityId });
      } else if (data.status === 'docked' || data.status === 'returning') {
        callService('vacuum', 'return_to_base', { entity_id: entityId });
      } else {
        callService('vacuum', 'stop', { entity_id: entityId });
      }
      break;
    }

    case 'media_player': {
      const data = state.data as any;
      // Handle media actions (next/previous/stop)
      if (data._action === 'next') {
        callService('media_player', 'media_next_track', { entity_id: entityId });
        break;
      }
      if (data._action === 'previous') {
        callService('media_player', 'media_previous_track', { entity_id: entityId });
        break;
      }
      if (data._action === 'stop') {
        callService('media_player', 'media_stop', { entity_id: entityId });
        break;
      }
      if (!data.on) {
        callService('media_player', 'turn_off', { entity_id: entityId });
      } else {
        if (data.state === 'playing') callService('media_player', 'media_play', { entity_id: entityId });
        else if (data.state === 'paused') callService('media_player', 'media_pause', { entity_id: entityId });
        if (typeof data.volume === 'number') {
          callService('media_player', 'volume_set', { entity_id: entityId, volume_level: data.volume });
        }
      }
      break;
    }

    case 'fan': {
      const data = state.data as any;
      if (!data.on) {
        callService('fan', 'turn_off', { entity_id: entityId });
      } else {
        const serviceData: Record<string, unknown> = { entity_id: entityId };
        if (typeof data.speed === 'number') serviceData.percentage = data.speed;
        callService('fan', 'turn_on', serviceData);
        if (typeof data.speed === 'number') {
          callService('fan', 'set_percentage', { entity_id: entityId, percentage: data.speed });
        }
      }
      break;
    }

    case 'cover': {
      const data = state.data as any;
      if (typeof data.position === 'number') {
        callService('cover', 'set_cover_position', { entity_id: entityId, position: data.position });
      } else if (data.state === 'open') {
        callService('cover', 'open_cover', { entity_id: entityId });
      } else if (data.state === 'closed') {
        callService('cover', 'close_cover', { entity_id: entityId });
      } else {
        callService('cover', 'stop_cover', { entity_id: entityId });
      }
      break;
    }

    case 'scene': {
      callService(domain, 'turn_on', { entity_id: entityId });
      break;
    }

    case 'script': {
      callService('script', 'turn_on', { entity_id: entityId });
      break;
    }

    case 'automation': {
      callService('automation', 'trigger', { entity_id: entityId });
      break;
    }
  }
}

/**
 * Hook that watches deviceStates changes and sends corresponding HA service calls.
 * Mount in HomeView and BuildModeV2.
 */
export function useHABridge() {
  const prevStatesRef = useRef<Record<string, DeviceState>>({});

  useEffect(() => {
    // Initialize with current states
    prevStatesRef.current = { ...useAppStore.getState().devices.deviceStates };

    const unsub = useAppStore.subscribe((state) => {
      // If this change originated from HA, don't send commands back
      if (fromHA) {
        prevStatesRef.current = { ...state.devices.deviceStates };
        return;
      }

      const currentStates = state.devices.deviceStates;
      const markers = state.devices.markers;
      const haStatus = state.homeAssistant.status;

      if (haStatus !== 'connected') {
        prevStatesRef.current = { ...currentStates };
        return;
      }

      // Find changed device states
      for (const [id, newState] of Object.entries(currentStates)) {
        const oldState = prevStatesRef.current[id];
        if (oldState && newState !== oldState) {
          // State changed — check if device is linked to HA
          const marker = markers.find((m) => m.id === id);
          const entityId = marker?.ha?.entityId;
          if (entityId) {
            sendHACommand(entityId, newState);
          }
        }
      }

      prevStatesRef.current = { ...currentStates };
    });

    return unsub;
  }, []);
}
