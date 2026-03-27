import { describe, expect, it } from 'vitest';
import type { DeviceState } from '../store/types';
import { mergeHADeviceState } from '../lib/haMapping';

describe('mergeHADeviceState', () => {
  it('bevarar vacuum UI-only fält när HA live-state uppdateras', () => {
    const existing: DeviceState = {
      kind: 'vacuum',
      data: {
        on: true,
        status: 'cleaning',
        battery: 82,
        currentRoom: 'Kök',
        targetRoom: 'Hall',
        cleaningLog: [{ roomName: 'Hall', area: 12, duration: 18, timestamp: '2026-03-27T10:00:00.000Z' }],
        showDustEffect: false,
        vacuumSpeed: 0.09,
        showDebugOverlay: true,
      },
    };

    const mapped: DeviceState = {
      kind: 'vacuum',
      data: {
        on: false,
        status: 'docked',
        battery: 91,
      },
    };

    expect(mergeHADeviceState(existing, mapped)).toEqual({
      kind: 'vacuum',
      data: {
        on: false,
        status: 'docked',
        battery: 91,
        currentRoom: 'Kök',
        targetRoom: 'Hall',
        cleaningLog: [{ roomName: 'Hall', area: 12, duration: 18, timestamp: '2026-03-27T10:00:00.000Z' }],
        showDustEffect: false,
        vacuumSpeed: 0.09,
        showDebugOverlay: true,
      },
    });
  });

  it('låter icke-vacuum-state passera oförändrad', () => {
    const existing: DeviceState = { kind: 'light', data: { on: true, brightness: 100, colorMode: 'temp' } };
    const mapped: DeviceState = { kind: 'light', data: { on: false, brightness: 0, colorMode: 'off' } };

    expect(mergeHADeviceState(existing, mapped)).toEqual(mapped);
  });
});
