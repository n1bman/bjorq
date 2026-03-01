import type { DeviceState } from '../store/types';

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
      return { kind: 'generic', data: { on: state === 'on' } };

    case 'fan': {
      const on = state === 'on';
      const speed = typeof attributes.percentage === 'number' ? attributes.percentage : (on ? 100 : 0);
      const presetMap: Record<string, 'low' | 'medium' | 'high'> = { low: 'low', medium: 'medium', high: 'high' };
      const preset = typeof attributes.preset_mode === 'string' ? presetMap[attributes.preset_mode] : undefined;
      return { kind: 'fan', data: { on, speed, preset } };
    }

    case 'cover': {
      const pos = typeof attributes.current_position === 'number' ? attributes.current_position : (state === 'open' ? 100 : 0);
      const coverStateMap: Record<string, 'open' | 'closed' | 'opening' | 'closing' | 'stopped'> = {
        open: 'open', closed: 'closed', opening: 'opening', closing: 'closing', stopped: 'stopped',
      };
      return { kind: 'cover', data: { position: pos, state: coverStateMap[state] || 'closed' } };
    }

    case 'scene':
    case 'script':
    case 'automation':
      return { kind: 'scene', data: {} };

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
      const deviceClass = typeof attributes.device_class === 'string' ? attributes.device_class : '';
      // Binary sensors: use on/off instead of parseFloat
      if (domain === 'binary_sensor') {
        if (deviceClass === 'motion') {
          const detected = state === 'on';
          return { kind: 'sensor', data: { value: detected ? 1 : 0, unit: '', sensorType: 'motion' as const, ...(detected ? { lastMotion: new Date().toISOString() } : {}) } };
        }
        if (deviceClass === 'door' || deviceClass === 'window' || deviceClass === 'opening') {
          return { kind: 'sensor', data: { value: state === 'on' ? 1 : 0, unit: '', sensorType: 'contact' as const } };
        }
        return { kind: 'sensor', data: { value: state === 'on' ? 1 : 0, unit: '', sensorType: 'generic' as const } };
      }
      const value = parseFloat(state) || 0;
      const unit = typeof attributes.unit_of_measurement === 'string' ? attributes.unit_of_measurement : '';
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
      const statusMap: Record<string, 'cleaning' | 'docked' | 'returning' | 'paused' | 'idle' | 'error'> = {
        cleaning: 'cleaning', docked: 'docked', returning: 'returning',
        paused: 'paused', idle: 'idle', error: 'error',
      };
      const battery = typeof attributes.battery_level === 'number' ? attributes.battery_level : 100;
      const fanSpeedList = Array.isArray(attributes.fan_speed_list) ? attributes.fan_speed_list as string[] : undefined;
      // fan_speed from HA is a string preset name (e.g. "gentle", "balanced", "turbo")
      let fanSpeed: number | undefined;
      let fanSpeedPreset: string | undefined;
      if (typeof attributes.fan_speed === 'string' && attributes.fan_speed) {
        fanSpeedPreset = attributes.fan_speed;
        // Map preset name to percentage using its index in the list
        if (fanSpeedList && fanSpeedList.length > 0) {
          const idx = fanSpeedList.findIndex((p) => p.toLowerCase() === (attributes.fan_speed as string).toLowerCase());
          fanSpeed = idx >= 0 ? Math.round(((idx + 1) / fanSpeedList.length) * 100) : 50;
        } else {
          fanSpeed = parseInt(attributes.fan_speed as string, 10) || undefined;
        }
      } else if (typeof attributes.fan_speed === 'number') {
        fanSpeed = attributes.fan_speed;
      }
      const cleaningArea = typeof attributes.cleaned_area === 'number' ? attributes.cleaned_area : undefined;
      const cleaningTime = typeof attributes.cleaning_time === 'number' ? attributes.cleaning_time : undefined;
      const errorMessage = typeof attributes.error === 'string' && attributes.error ? attributes.error : undefined;
      return {
        kind: 'vacuum',
        data: {
          on: state === 'cleaning',
          status: statusMap[state] || 'docked',
          battery,
          ...(fanSpeed !== undefined && { fanSpeed }),
          ...(fanSpeedPreset && { fanSpeedPreset }),
          ...(fanSpeedList && { fanSpeedList }),
          ...(cleaningArea !== undefined && { cleaningArea }),
          ...(cleaningTime !== undefined && { cleaningTime }),
          ...(errorMessage && { errorMessage }),
        },
      };
    }
    case 'media_player': {
      const stateMap: Record<string, 'playing' | 'paused' | 'idle' | 'off'> = {
        playing: 'playing', paused: 'paused', idle: 'idle', off: 'off', standby: 'off',
      };
      const volume = typeof attributes.volume_level === 'number' ? attributes.volume_level : 0.5;
      const deviceClass = typeof attributes.device_class === 'string' ? attributes.device_class : '';
      
      // Speaker / soundbar → SpeakerState
      if (deviceClass === 'speaker') {
        // Detect "Hey Google" / assistant listening states
        const isSpeaking = state === 'buffering' || 
          (typeof attributes.media_content_type === 'string' && attributes.media_content_type === 'assistant') ||
          (typeof attributes.app_name === 'string' && attributes.app_name.toLowerCase().includes('assistant'));
        return {
          kind: 'speaker',
          data: {
            on: state !== 'off' && state !== 'standby',
            state: (stateMap[state] === 'off' ? 'idle' : stateMap[state] || 'idle') as 'playing' | 'paused' | 'idle',
            volume,
            source: typeof attributes.source === 'string' ? attributes.source : undefined,
            mediaTitle: typeof attributes.media_title === 'string' ? attributes.media_title : undefined,
            isSpeaking,
          },
        };
      }
      
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
    case 'alarm_control_panel': {
      const stateMap: Record<string, 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered'> = {
        disarmed: 'disarmed', armed_home: 'armed_home', armed_away: 'armed_away',
        armed_night: 'armed_night', pending: 'pending', triggered: 'triggered',
      };
      return { kind: 'alarm', data: { state: stateMap[state] || 'disarmed' } };
    }

    case 'water_heater': {
      const on = state !== 'off';
      const temp = typeof attributes.temperature === 'number' ? attributes.temperature : 50;
      const modeMap: Record<string, 'eco' | 'electric' | 'performance' | 'off'> = {
        eco: 'eco', electric: 'electric', performance: 'performance', off: 'off',
      };
      const mode = typeof attributes.operation_mode === 'string' ? (modeMap[attributes.operation_mode] ?? 'electric') : (on ? 'electric' : 'off');
      return { kind: 'water-heater', data: { on, temperature: temp, mode } };
    }

    case 'humidifier': {
      const on = state === 'on';
      const humidity = typeof attributes.humidity === 'number' ? attributes.humidity : 50;
      const mode = typeof attributes.mode === 'string' ? attributes.mode : undefined;
      const availableModes = Array.isArray(attributes.available_modes) ? attributes.available_modes as string[] : undefined;
      return { kind: 'humidifier', data: { on, humidity, mode, availableModes } };
    }

    case 'siren': {
      const on = state === 'on';
      const tone = typeof attributes.tone === 'string' ? attributes.tone : undefined;
      const volume = typeof attributes.volume_level === 'number' ? attributes.volume_level : undefined;
      const availableTones = Array.isArray(attributes.available_tones) ? attributes.available_tones as string[] : undefined;
      return { kind: 'siren', data: { on, tone, volume, availableTones } };
    }

    case 'button':
      return { kind: 'generic', data: { on: false } };

    case 'number':
    case 'input_number': {
      const value = parseFloat(state) || 0;
      const unit = typeof attributes.unit_of_measurement === 'string' ? attributes.unit_of_measurement : '';
      return { kind: 'sensor', data: { value, unit, sensorType: 'generic' } };
    }

    case 'select':
    case 'input_select':
      return { kind: 'generic', data: { on: true } };

    case 'valve': {
      const pos = typeof attributes.current_position === 'number' ? attributes.current_position : (state === 'open' ? 100 : 0);
      const valveStateMap: Record<string, 'open' | 'closed' | 'opening' | 'closing'> = {
        open: 'open', closed: 'closed', opening: 'opening', closing: 'closing',
      };
      return { kind: 'valve', data: { position: pos, state: valveStateMap[state] || 'closed' } };
    }

    case 'remote':
      return { kind: 'generic', data: { on: state === 'on' } };

    case 'lawn_mower': {
      const statusMap: Record<string, 'mowing' | 'docked' | 'returning' | 'paused' | 'idle' | 'error'> = {
        mowing: 'mowing', docked: 'docked', returning: 'returning',
        paused: 'paused', idle: 'idle', error: 'error',
      };
      const battery = typeof attributes.battery_level === 'number' ? attributes.battery_level : 100;
      const errorMessage = typeof attributes.error === 'string' && attributes.error ? attributes.error : undefined;
      return { kind: 'lawn-mower', data: { on: state === 'mowing', status: statusMap[state] || 'docked', battery, ...(errorMessage && { errorMessage }) } };
    }

    default:
      return null;
  }
}
