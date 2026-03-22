import { describe, expect, it } from 'vitest';
import { getAutomationEntityViews, getClimateEntityViews, getEnergyEntityViews, getRobotEntityViews, getSceneEntityViews, getSurveillanceEntityViews } from '../lib/haMenuSelectors';
import type { AppState } from '../store/types';

function createState(): AppState {
  return {
    _hostedMode: true,
    appMode: 'dashboard',
    setAppMode: () => {},
    layout: { floors: [], activeFloorId: null, scaleCalibrated: false },
    build: {} as any,
    homeGeometry: {} as any,
    devices: {
      markers: [
        { id: 'cam-1', kind: 'camera', name: 'Hallkamera', floorId: 'f1', surface: 'wall', position: [0, 0, 0], rotation: [0, 0, 0], ha: { entityId: 'camera.hall' } },
        { id: 'vac-1', kind: 'vacuum', name: 'Roboten', floorId: 'f1', surface: 'floor', position: [0, 0, 0], rotation: [0, 0, 0], ha: { entityId: 'vacuum.house' } },
      ],
      deviceStates: {},
      vacuumDebug: {},
    },
    props: {} as any,
    environment: {} as any,
    homeAssistant: {
      status: 'connected',
      wsUrl: '',
      token: '',
      entities: [
        { entityId: 'sensor.total_power', domain: 'sensor', friendlyName: 'Total Power', state: '420', attributes: { device_class: 'power', unit_of_measurement: 'W' } },
        { entityId: 'sensor.total_energy', domain: 'sensor', friendlyName: 'Total Energy', state: '8.4', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' } },
        { entityId: 'climate.living_room', domain: 'climate', friendlyName: 'Living Room', state: 'heat', attributes: {} },
        { entityId: 'automation.good_morning', domain: 'automation', friendlyName: 'Good Morning', state: 'on', attributes: {} },
        { entityId: 'scene.movie', domain: 'scene', friendlyName: 'Movie', state: 'scening', attributes: {} },
        { entityId: 'script.party', domain: 'script', friendlyName: 'Party', state: 'off', attributes: {} },
        { entityId: 'camera.hall', domain: 'camera', friendlyName: 'Hallkamera', state: 'streaming', attributes: {} },
        { entityId: 'binary_sensor.hall_motion', domain: 'binary_sensor', friendlyName: 'Hall Motion', state: 'on', attributes: { device_class: 'motion' } },
        { entityId: 'vacuum.house', domain: 'vacuum', friendlyName: 'House Vacuum', state: 'docked', attributes: {} },
        { entityId: 'lawn_mower.garden', domain: 'lawn_mower', friendlyName: 'Garden Robot', state: 'docked', attributes: {} },
      ],
      liveStates: {},
      vacuumSegmentMap: {},
    },
    homeView: {} as any,
    activityLog: [],
    profile: {} as any,
    customCategories: [],
    standby: {} as any,
    _preStandbyMode: 'dashboard',
    performance: {} as any,
    wifi: {} as any,
    energyConfig: { pricePerKwh: 1.5, currency: 'kr' },
    calendar: {} as any,
    automations: [],
    savedScenes: [],
    comfort: { rules: [], override: { active: false } },
    terrain: {} as any,
    wizard: {} as any,
    dashboard: {} as any,
  } as AppState;
}

describe('haMenuSelectors', () => {
  it('groups energy sensors by power and energy', () => {
    const state = createState();
    const result = getEnergyEntityViews(state);
    expect(result.powerSensors).toHaveLength(1);
    expect(result.energySensors).toHaveLength(1);
  });

  it('keeps climate and climate-adjacent selectors separate', () => {
    const state = createState();
    const result = getClimateEntityViews(state);
    expect(result.climates).toHaveLength(1);
    expect(result.temperatureSensors).toHaveLength(0);
  });

  it('finds automation, scene, surveillance and robot entities', () => {
    const state = createState();
    expect(getAutomationEntityViews(state)).toHaveLength(1);
    expect(getSceneEntityViews(state).scenes).toHaveLength(1);
    expect(getSceneEntityViews(state).scripts).toHaveLength(1);
    expect(getSurveillanceEntityViews(state).cameras[0].linked).toBe(true);
    expect(getRobotEntityViews(state).vacuums[0].linked).toBe(true);
    expect(getRobotEntityViews(state).lawnMowers).toHaveLength(1);
  });
});
