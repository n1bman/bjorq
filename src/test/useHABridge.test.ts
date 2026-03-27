import { describe, expect, it } from 'vitest';
import type { DeviceMarker, HAEntity } from '../store/types';
import { canSendHACommands, findVacuumRoomSensorId, readVacuumCurrentRoom, sanitizeVacuumRoomName } from '../hooks/useHABridge';

function buildVacuumMarker(entityId: string, name = 'Robot'): DeviceMarker {
  return {
    id: `marker-${entityId}`,
    kind: 'vacuum',
    name,
    floorId: 'floor-1',
    surface: 'floor',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    ha: { entityId },
  };
}

function buildEntity(entityId: string, friendlyName: string, attributes: Record<string, unknown> = {}): HAEntity {
  return {
    entityId,
    domain: entityId.split('.')[0],
    friendlyName,
    state: 'idle',
    attributes,
  };
}

describe('useHABridge vacuum helpers', () => {
  it('läser current_room direkt från vacuum-attribut när den finns', () => {
    expect(readVacuumCurrentRoom({ current_room: 'Kök' })).toBe('Kök');
    expect(readVacuumCurrentRoom({ currentRoom: 'Hall' })).toBe('Hall');
    expect(readVacuumCurrentRoom({ room_name: 'Sovrum' })).toBe('Sovrum');
  });

  it('ignorerar tomma och otillgängliga room-värden', () => {
    expect(sanitizeVacuumRoomName('')).toBeNull();
    expect(sanitizeVacuumRoomName('unknown')).toBeNull();
    expect(sanitizeVacuumRoomName('unavailable')).toBeNull();
    expect(sanitizeVacuumRoomName('  Kök  ')).toBe('Kök');
  });

  it('matchar rätt room-sensor för rätt vacuum när flera kandidater finns', () => {
    const marker = buildVacuumMarker('vacuum.roborock_s8', 'Roborock S8');
    const entities: HAEntity[] = [
      buildEntity('vacuum.roborock_s8', 'Roborock S8'),
      buildEntity('sensor.roborock_qrevo_current_room', 'Roborock Q Revo Current Room', { options: ['Hall'] }),
      buildEntity('sensor.roborock_s8_current_room', 'Roborock S8 Current Room', { options: ['Kök'] }),
    ];

    expect(findVacuumRoomSensorId(marker, entities)).toBe('sensor.roborock_s8_current_room');
  });

  it('faller tillbaka till enda kandidat när bara en room-sensor finns', () => {
    const marker = buildVacuumMarker('vacuum.s5_max', 'Roborock S5 Max');
    const entities: HAEntity[] = [
      buildEntity('vacuum.s5_max', 'Roborock S5 Max'),
      buildEntity('sensor.s5_max_nuvarande_rum', 'Roborock S5 Max Nuvarande Rum', { options: ['Kök'] }),
    ];

    expect(findVacuumRoomSensorId(marker, entities)).toBe('sensor.s5_max_nuvarande_rum');
  });

  it('tillåter HA-kommandon i degraded hosted-läge', () => {
    expect(canSendHACommands('connected')).toBe(true);
    expect(canSendHACommands('degraded')).toBe(true);
    expect(canSendHACommands('connecting')).toBe(false);
    expect(canSendHACommands('disconnected')).toBe(false);
  });
});
