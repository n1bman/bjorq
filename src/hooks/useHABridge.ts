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
      // Handle special actions
      if (data._action === 'locate') {
        callService('vacuum', 'locate', { entity_id: entityId });
        break;
      }
      if (data._action === 'spot_clean') {
        callService('vacuum', 'clean_spot', { entity_id: entityId });
        break;
      }
      // Handle fan speed change — send preset name string, not percentage
      if (typeof data.fanSpeed === 'number' && data.fanSpeed > 0) {
        const presets = data.fanSpeedList as string[] | undefined;
        if (presets && presets.length > 0) {
          // Map percentage to closest preset name
          const idx = Math.round((data.fanSpeed / 100) * (presets.length - 1));
          const presetName = presets[Math.max(0, Math.min(idx, presets.length - 1))];
          console.log('[HABridge] Setting fan_speed preset:', presetName, 'from', data.fanSpeed, '%');
          callService('vacuum', 'set_fan_speed', { entity_id: entityId, fan_speed: presetName });
        } else {
          callService('vacuum', 'set_fan_speed', { entity_id: entityId, fan_speed: data.fanSpeed });
        }
      }
      // Handle room-specific cleaning via send_command
      if (data.targetRoom && data.status === 'cleaning') {
        // First stop current task so Roborock accepts new segment clean
        callService('vacuum', 'stop', { entity_id: entityId });
        // Small delay then send segment clean
        setTimeout(() => {
          const callServiceNow = haServiceCaller.current;
          if (!callServiceNow) return;

          // 1. Try auto-discovered segment map
          const segmentMap = useAppStore.getState().homeAssistant.vacuumSegmentMap;
          let segId: number | undefined = segmentMap[data.targetRoom];

          // 2. Try resolving display name from floors/rooms
          if (segId === undefined) {
            const storeState = useAppStore.getState();
            const vacMarker = storeState.devices.markers.find((m) => m.ha?.entityId === entityId);
            const vacFloor = storeState.layout.floors.find((f) => f.id === vacMarker?.floorId);
            const rooms = vacFloor?.rooms ?? [];
            const zone = vacFloor?.vacuumMapping?.zones?.find((z) => z.roomId === data.targetRoom);
            
            // Try zone's segmentId first
            if (zone?.segmentId) {
              segId = zone.segmentId;
            } else {
              // Resolve display name and look up in segment map
              const room = rooms.find((r) => r.id === data.targetRoom || r.name === data.targetRoom);
              const displayName = room?.name ?? data.targetRoom;
              if (displayName !== data.targetRoom) {
                segId = segmentMap[displayName];
              }
              // Also try case-insensitive match
              if (segId === undefined) {
                const key = Object.keys(segmentMap).find(
                  (k) => k.toLowerCase() === (displayName ?? '').toLowerCase()
                );
                if (key) segId = segmentMap[key];
              }
            }
          }

          if (segId !== undefined) {
            console.log('[HABridge] Sending app_segment_clean with segmentId:', segId, 'for room:', data.targetRoom);
            callServiceNow('vacuum', 'send_command', {
              entity_id: entityId,
              command: 'app_segment_clean',
              params: [segId],
            });
          } else {
            console.warn('[HABridge] No segment ID found for room:', data.targetRoom);
          }
        }, 500);
        break;
      }
      if (data.status === 'cleaning') {
        callService('vacuum', 'start', { entity_id: entityId });
      } else if (data.status === 'docked' || data.status === 'returning') {
        callService('vacuum', 'return_to_base', { entity_id: entityId });
      } else if (data.status === 'paused') {
        callService('vacuum', 'pause', { entity_id: entityId });
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

    case 'alarm_control_panel': {
      const data = state.data as any;
      const code = data.code ? { code: data.code } : {};
      if (data.state === 'armed_away') callService('alarm_control_panel', 'alarm_arm_away', { entity_id: entityId, ...code });
      else if (data.state === 'armed_home') callService('alarm_control_panel', 'alarm_arm_home', { entity_id: entityId, ...code });
      else if (data.state === 'armed_night') callService('alarm_control_panel', 'alarm_arm_night', { entity_id: entityId, ...code });
      else callService('alarm_control_panel', 'alarm_disarm', { entity_id: entityId, ...code });
      break;
    }

    case 'water_heater': {
      const data = state.data as any;
      if (typeof data.temperature === 'number') {
        callService('water_heater', 'set_temperature', { entity_id: entityId, temperature: data.temperature });
      }
      if (data.mode) {
        callService('water_heater', 'set_operation_mode', { entity_id: entityId, operation_mode: data.mode });
      }
      break;
    }

    case 'humidifier': {
      const data = state.data as any;
      if (!data.on) {
        callService('humidifier', 'turn_off', { entity_id: entityId });
      } else {
        callService('humidifier', 'turn_on', { entity_id: entityId });
        if (typeof data.humidity === 'number') {
          callService('humidifier', 'set_humidity', { entity_id: entityId, humidity: data.humidity });
        }
        if (data.mode) {
          callService('humidifier', 'set_mode', { entity_id: entityId, mode: data.mode });
        }
      }
      break;
    }

    case 'siren': {
      const data = state.data as any;
      if (data.on) {
        const sd: Record<string, unknown> = { entity_id: entityId };
        if (data.tone) sd.tone = data.tone;
        if (typeof data.volume === 'number') sd.volume_level = data.volume;
        callService('siren', 'turn_on', sd);
      } else {
        callService('siren', 'turn_off', { entity_id: entityId });
      }
      break;
    }

    case 'button': {
      callService('button', 'press', { entity_id: entityId });
      break;
    }

    case 'number':
    case 'input_number': {
      const data = state.data as any;
      if (typeof data.value === 'number') {
        callService(domain, 'set_value', { entity_id: entityId, value: data.value });
      }
      break;
    }

    case 'select':
    case 'input_select': {
      const data = state.data as any;
      if (data.option) {
        callService(domain, 'select_option', { entity_id: entityId, option: data.option });
      }
      break;
    }

    case 'valve': {
      const data = state.data as any;
      if (typeof data.position === 'number') {
        callService('valve', 'set_valve_position', { entity_id: entityId, position: data.position });
      } else if (data.state === 'open') {
        callService('valve', 'open_valve', { entity_id: entityId });
      } else {
        callService('valve', 'close_valve', { entity_id: entityId });
      }
      break;
    }

    case 'lawn_mower': {
      const data = state.data as any;
      if (data.status === 'mowing') callService('lawn_mower', 'start_mowing', { entity_id: entityId });
      else if (data.status === 'docked' || data.status === 'returning') callService('lawn_mower', 'dock', { entity_id: entityId });
      else if (data.status === 'paused') callService('lawn_mower', 'pause', { entity_id: entityId });
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

/**
 * Hook that listens to `sensor.s5_max_nuvarande_rum` and updates
 * vacuum device currentRoom in deviceState.
 */
export function useVacuumRoomSync() {
  const prevRoomRef = useRef<string>('');
  const sensorIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      // Dynamically discover room sensor (matches *nuvarande_rum, *current_room, etc.)
      if (!sensorIdRef.current) {
        const candidates = Object.keys(state.homeAssistant.liveStates).filter(
          (id) => id.startsWith('sensor.') && (/nuvarande.rum/i.test(id) || /current.room/i.test(id))
        );
        if (candidates.length > 0) sensorIdRef.current = candidates[0];
        // Also check HA entities for sensors with 'options' attribute containing room names
        if (!sensorIdRef.current) {
          const entity = state.homeAssistant.entities.find(
            (e) => e.domain === 'sensor' && (e.attributes?.['options'] || e.attributes?.['room_list'])
              && (/nuvarande|current.room/i.test(e.entityId))
          );
          if (entity) sensorIdRef.current = entity.entityId;
        }
      }
      if (!sensorIdRef.current) return;

      const live = state.homeAssistant.liveStates[sensorIdRef.current];
      if (!live) return;

      const roomName = live.state;
      if (roomName === prevRoomRef.current) return;
      prevRoomRef.current = roomName;

      // Find vacuum device markers and update their currentRoom
      const vacuumMarkers = state.devices.markers.filter((m) => m.kind === 'vacuum');
      for (const marker of vacuumMarkers) {
        const ds = state.devices.deviceStates[marker.id];
        if (ds?.kind === 'vacuum') {
          setFromHA(true);
          useAppStore.getState().updateDeviceState(marker.id, { currentRoom: roomName });
          queueMicrotask(() => setFromHA(false));
        }
      }
    });

    return unsub;
  }, []);
}
