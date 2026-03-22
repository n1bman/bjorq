import type { AppState, DeviceMarker, DeviceState, HAEntity } from '../store/types';

export interface HAEntityView {
  entity: HAEntity;
  marker?: DeviceMarker;
  deviceState?: DeviceState;
  linked: boolean;
}

function sortByName<T extends { friendlyName?: string; entity?: { friendlyName: string; entityId: string }; entityId?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aName = 'entity' in a && a.entity ? a.entity.friendlyName : a.friendlyName || a.entityId || '';
    const bName = 'entity' in b && b.entity ? b.entity.friendlyName : b.friendlyName || b.entityId || '';
    return aName.localeCompare(bName, 'sv');
  });
}

export function getHAEntityViews(state: AppState, domains: string[]): HAEntityView[] {
  const byEntityId = new Map<string, DeviceMarker>();
  for (const marker of state.devices.markers) {
    if (marker.ha?.entityId) byEntityId.set(marker.ha.entityId, marker);
  }

  return sortByName(
    state.homeAssistant.entities
      .filter((entity) => domains.includes(entity.domain))
      .map((entity) => {
        const marker = byEntityId.get(entity.entityId);
        return {
          entity,
          marker,
          deviceState: marker ? state.devices.deviceStates[marker.id] : undefined,
          linked: !!marker,
        };
      })
  );
}

export function getEnergyEntityViews(state: AppState) {
  const allSensors = getHAEntityViews(state, ['sensor']);
  const powerSensors = allSensors.filter(({ entity }) => {
    const deviceClass = typeof entity.attributes.device_class === 'string' ? entity.attributes.device_class : '';
    const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : '';
    return deviceClass === 'power' || /power|watt/i.test(entity.entityId) || /^w|kw$/i.test(unit);
  });
  const energySensors = allSensors.filter(({ entity }) => {
    const deviceClass = typeof entity.attributes.device_class === 'string' ? entity.attributes.device_class : '';
    const unit = typeof entity.attributes.unit_of_measurement === 'string' ? entity.attributes.unit_of_measurement : '';
    return deviceClass === 'energy' || /energy|consumption/i.test(entity.entityId) || /kwh|wh/i.test(unit);
  });
  return { powerSensors, energySensors };
}

export function getClimateEntityViews(state: AppState) {
  return {
    climates: getHAEntityViews(state, ['climate']),
    fans: getHAEntityViews(state, ['fan']),
    humidifiers: getHAEntityViews(state, ['humidifier']),
    waterHeaters: getHAEntityViews(state, ['water_heater']),
    temperatureSensors: getHAEntityViews(state, ['sensor']).filter(({ entity }) => entity.attributes.device_class === 'temperature'),
    humiditySensors: getHAEntityViews(state, ['sensor']).filter(({ entity }) => entity.attributes.device_class === 'humidity'),
  };
}

export function getAutomationEntityViews(state: AppState) {
  return getHAEntityViews(state, ['automation']);
}

export function getSceneEntityViews(state: AppState) {
  return {
    scenes: getHAEntityViews(state, ['scene']),
    scripts: getHAEntityViews(state, ['script']),
  };
}

export function getSurveillanceEntityViews(state: AppState) {
  const cameras = getHAEntityViews(state, ['camera']);
  const motionSensors = getHAEntityViews(state, ['binary_sensor']).filter(({ entity }) => {
    const deviceClass = typeof entity.attributes.device_class === 'string' ? entity.attributes.device_class : '';
    return deviceClass === 'motion' || /motion|rörelse/i.test(entity.entityId);
  });
  return { cameras, motionSensors };
}

export function getRobotEntityViews(state: AppState) {
  return {
    vacuums: getHAEntityViews(state, ['vacuum']),
    lawnMowers: getHAEntityViews(state, ['lawn_mower']),
  };
}

export function getLinkedStateLabel(view: HAEntityView): string {
  const live = view.entity.state;
  if (view.deviceState?.kind === 'climate') {
    return `${view.deviceState.data.currentTemp}°C / ${view.deviceState.data.targetTemp}°C`;
  }
  if (view.deviceState?.kind === 'vacuum') {
    return view.deviceState.data.status;
  }
  return live;
}

