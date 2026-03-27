import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-ignore — server JS module without type declarations
import { buildWsUrl, HALiveHub, findPrimaryVacuumEntityId, parseVacuumSegmentMap } from '../../server/ha/liveHub.js';

beforeEach(() => {
  vi.useRealTimers();
});

describe('liveHub helpers', () => {
  it('builds websocket url from base HA url', () => {
    expect(buildWsUrl('http://homeassistant.local:8123')).toBe('ws://homeassistant.local:8123/api/websocket');
    expect(buildWsUrl('https://demo.local/')).toBe('wss://demo.local/api/websocket');
  });

  it('parses vacuum segment maps from array payload', () => {
    const map = parseVacuumSegmentMap({
      response: {
        maps: [
          {
            rooms: [
              { name: 'Kök', id: 16 },
              { label: 'Vardagsrum', segment_id: 21 },
            ],
          },
        ],
      },
    });

    expect(map).toEqual({ 'Kök': 16, 'Vardagsrum': 21 });
  });

  it('parses vacuum segment maps from keyed object payload', () => {
    const map = parseVacuumSegmentMap({
      maps: {
        rooms: {
          '18': { name: 'Hall' },
          '24': 'Sovrum',
        },
      },
    });

    expect(map).toEqual({ Hall: 18, Sovrum: 24 });
  });

  it('parses vacuum segment maps from HA service_response payloads', () => {
    const map = parseVacuumSegmentMap({
      changed_states: [],
      service_response: {
        'vacuum.s5_max': {
          maps: [
            {
              rooms: {
                '16': 'Tvrummet',
                '17': 'Koket',
                '21': 'Hallen',
              },
            },
          ],
        },
      },
    });

    expect(map).toEqual({ Tvrummet: 16, Koket: 17, Hallen: 21 });
  });

  it('finds the primary vacuum entity from HA states or mapped entities', () => {
    expect(findPrimaryVacuumEntityId([
      { entity_id: 'light.kitchen' },
      { entity_id: 'vacuum.roborock_s8' },
    ])).toBe('vacuum.roborock_s8');

    expect(findPrimaryVacuumEntityId([
      { entityId: 'sensor.temp' },
      { entityId: 'vacuum.downstairs' },
    ])).toBe('vacuum.downstairs');
  });

  it('refreshes vacuum map on full state and later vacuum entity updates', async () => {
    vi.useFakeTimers();
    const hub = new HALiveHub();
    const refreshSpy = vi.spyOn(hub, 'refreshVacuumMap').mockResolvedValue(undefined);

    hub.applyFullState([
      { entity_id: 'vacuum.roborock_s8', state: 'docked', attributes: {} },
      { entity_id: 'light.kitchen', state: 'on', attributes: {} },
    ]);

    await vi.runAllTimersAsync();
    expect(refreshSpy).toHaveBeenCalledWith('vacuum.roborock_s8');

    refreshSpy.mockClear();
    hub.applyEntityUpdate('vacuum.roborock_s8', 'cleaning', {});

    await vi.runAllTimersAsync();
    expect(refreshSpy).toHaveBeenCalledWith('vacuum.roborock_s8');
  });
});
