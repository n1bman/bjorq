import { describe, expect, it } from 'vitest';
import { buildWsUrl, parseVacuumSegmentMap } from '../../server/ha/liveHub.js';

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
});
