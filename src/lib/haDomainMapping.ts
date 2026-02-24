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
    default: return null;
  }
}
