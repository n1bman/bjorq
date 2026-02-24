import type { DeviceState } from '@/store/types';

/**
 * Maps a Home Assistant entity state + attributes to our internal DeviceState format.
 */
export function mapHAEntityToDeviceState(
  domain: string,
  state: string,
  attributes: Record<string, unknown>
): DeviceState | null {
  switch (domain) {
    case 'light': {
      const on = state === 'on';
      const brightness = typeof attributes.brightness === 'number' ? attributes.brightness : (on ? 255 : 0);
      const colorTemp = typeof attributes.color_temp === 'number' ? attributes.color_temp : 300;
      const rgbColor = Array.isArray(attributes.rgb_color) && attributes.rgb_color.length === 3
        ? attributes.rgb_color as [number, number, number]
        : undefined;
      const colorMode = rgbColor ? 'rgb' as const : (typeof attributes.color_temp === 'number' ? 'temp' as const : 'off' as const);
      return { kind: 'light', data: { on, brightness, colorTemp, rgbColor, colorMode } };
    }
    case 'switch':
    case 'input_boolean':
    case 'fan':
      return { kind: 'generic', data: { on: state === 'on' } };

    case 'climate': {
      const on = state !== 'off';
      const mode = (['heat', 'cool', 'auto', 'off'] as const).includes(state as any)
        ? (state as 'heat' | 'cool' | 'auto' | 'off')
        : (on ? 'auto' : 'off');
      const targetTemp = typeof attributes.temperature === 'number' ? attributes.temperature : 22;
      const currentTemp = typeof attributes.current_temperature === 'number' ? attributes.current_temperature : 20;
      return { kind: 'climate', data: { on, mode, targetTemp, currentTemp } };
    }
    case 'sensor':
    case 'binary_sensor': {
      const value = parseFloat(state) || 0;
      const unit = typeof attributes.unit_of_measurement === 'string' ? attributes.unit_of_measurement : '';
      const deviceClass = typeof attributes.device_class === 'string' ? attributes.device_class : '';
      const sensorType = deviceClass === 'temperature' ? 'temperature' as const
        : deviceClass === 'motion' ? 'motion' as const
        : 'generic' as const;
      return { kind: 'sensor', data: { value, unit, sensorType } };
    }
    case 'camera':
      return { kind: 'camera', data: { on: state !== 'off', streaming: state === 'streaming', lastSnapshot: typeof attributes.entity_picture === 'string' ? attributes.entity_picture : undefined } };

    case 'lock':
      return { kind: 'door-lock', data: { locked: state === 'locked' } };

    case 'vacuum': {
      const statusMap: Record<string, 'cleaning' | 'docked' | 'returning' | 'error'> = {
        cleaning: 'cleaning', docked: 'docked', returning: 'returning', error: 'error',
      };
      const battery = typeof attributes.battery_level === 'number' ? attributes.battery_level : 100;
      return { kind: 'vacuum', data: { on: state === 'cleaning', status: statusMap[state] || 'docked', battery } };
    }
    case 'media_player': {
      const stateMap: Record<string, 'playing' | 'paused' | 'idle' | 'off'> = {
        playing: 'playing', paused: 'paused', idle: 'idle', off: 'off', standby: 'off',
      };
      const volume = typeof attributes.volume_level === 'number' ? attributes.volume_level : 0.5;
      return {
        kind: 'media_screen',
        data: {
          on: state !== 'off' && state !== 'standby',
          state: stateMap[state] || 'idle',
          title: typeof attributes.media_title === 'string' ? attributes.media_title : undefined,
          artist: typeof attributes.media_artist === 'string' ? attributes.media_artist : undefined,
          source: typeof attributes.source === 'string' ? attributes.source : undefined,
          volume,
        },
      };
    }
    default:
      return null;
  }
}
