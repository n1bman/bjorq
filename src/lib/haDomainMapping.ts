import type { DeviceKind } from '@/store/types';

/** Maps a DeviceKind to the HA entity domains it should show */
export const kindToDomains: Record<DeviceKind, string[] | null> = {
  light: ['light'],
  switch: ['switch', 'input_boolean'],
  'power-outlet': ['switch'],
  sensor: ['sensor', 'binary_sensor'],
  climate: ['climate'],
  camera: ['camera'],
  vacuum: ['vacuum'],
  'door-lock': ['lock'],
  media_screen: ['media_player'],
  fan: ['fan'],
  cover: ['cover'],
  scene: ['scene', 'script', 'automation'],
  fridge: null,
  oven: null,
  washer: null,
  'garage-door': ['cover'],
  alarm: ['alarm_control_panel'],
  'water-heater': ['water_heater'],
  humidifier: ['humidifier'],
  siren: ['siren'],
  valve: ['valve'],
  remote: ['remote'],
  'lawn-mower': ['lawn_mower'],
};

/** Infer DeviceKind from an HA domain */
export function domainToKind(domain: string): DeviceKind | null {
  switch (domain) {
    case 'light': return 'light';
    case 'switch':
    case 'input_boolean': return 'switch';
    case 'climate': return 'climate';
    case 'sensor':
    case 'binary_sensor': return 'sensor';
    case 'camera': return 'camera';
    case 'vacuum': return 'vacuum';
    case 'lock': return 'door-lock';
    case 'media_player': return 'media_screen';
    case 'fan': return 'fan';
    case 'cover': return 'cover';
    case 'scene':
    case 'script':
    case 'automation': return 'scene';
    case 'alarm_control_panel': return 'alarm';
    case 'water_heater': return 'water-heater';
    case 'humidifier': return 'humidifier';
    case 'siren': return 'siren';
    case 'valve': return 'valve';
    case 'remote': return 'remote';
    case 'lawn_mower': return 'lawn-mower';
    case 'button': return 'switch';
    case 'number':
    case 'input_number': return 'sensor';
    case 'select':
    case 'input_select': return 'switch';
    default: return null;
  }
}
