import { setTimeout as delay } from 'timers/promises';
import { readFile } from 'fs/promises';
import { WebSocket } from 'ws';
import { getConfigWithSecurity } from '../security/auth.js';

export function buildWsUrl(baseUrl) {
  let finalUrl = (baseUrl || '').trim();
  if (!finalUrl) return '';
  if (finalUrl.startsWith('https://')) finalUrl = finalUrl.replace('https://', 'wss://');
  if (finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'ws://');
  if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);
  if (!finalUrl.endsWith('/api/websocket')) {
    finalUrl = `${finalUrl}/api/websocket`;
  }
  return finalUrl;
}

function mapEntity(entity) {
  return {
    entityId: entity.entity_id,
    domain: entity.entity_id.split('.')[0],
    friendlyName: entity.attributes?.friendly_name || entity.entity_id,
    state: entity.state,
    attributes: entity.attributes || {},
  };
}

export function parseVacuumSegmentMap(payload) {
  const response = payload?.service_response
    ? Object.values(payload.service_response || {})[0]
    : payload?.response ?? payload;
  const maps = response?.maps ?? response;
  const firstMap = Array.isArray(maps) ? maps[0] : maps;
  const rooms = firstMap?.rooms;
  const segmentMap = {};

  if (!rooms || typeof rooms !== 'object') return segmentMap;

  if (Array.isArray(rooms)) {
    for (const entry of rooms) {
      const name = entry?.name ?? entry?.label;
      const id = entry?.id ?? entry?.segment_id ?? entry?.segmentId;
      if (name && id !== undefined) {
        segmentMap[name] = typeof id === 'number' ? id : parseInt(id, 10);
      }
    }
    return segmentMap;
  }

  for (const [segmentId, value] of Object.entries(rooms)) {
    const name = typeof value === 'string' ? value : value?.name ?? value?.label;
    if (name) {
      segmentMap[name] = parseInt(segmentId, 10);
    }
  }

  return segmentMap;
}

export function findPrimaryVacuumEntityId(entities) {
  if (!Array.isArray(entities)) return null;
  const vacuum = entities.find((entity) => {
    const entityId = entity?.entity_id ?? entity?.entityId;
    return typeof entityId === 'string' && entityId.startsWith('vacuum.');
  });
  return vacuum?.entity_id ?? vacuum?.entityId ?? null;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getMockFixturePath() {
  const fixturePath = process.env.BJORQ_MOCK_HA_FIXTURE?.trim();
  return fixturePath ? fixturePath : null;
}

function buildLiveStatesFromEntities(entities) {
  return Object.fromEntries(
    (entities || []).map((entity) => [
      entity.entityId ?? entity.entity_id,
      { state: entity.state, attributes: entity.attributes || {} },
    ])
  );
}

function buildSegmentMapResponse(segmentMap) {
  return {
    response: {
      maps: [
        {
          rooms: Object.fromEntries(
            Object.entries(segmentMap || {}).map(([roomName, segmentId]) => [segmentId, { name: roomName }])
          ),
        },
      ],
    },
  };
}

function findMockRoomSensorEntityId(fixture, entities, vacuumEntityId) {
  const explicit = fixture?.vacuumRoomSensors?.[vacuumEntityId];
  if (explicit) return explicit;
  const stem = String(vacuumEntityId || '').split('.').slice(1).join('.');
  if (!stem) return null;
  const candidates = (entities || []).filter((entity) => entity.entityId?.startsWith('sensor.'));
  return candidates.find((entity) => entity.entityId.includes(stem))?.entityId ?? null;
}

function resolveMockRoomName(fixture, segmentId, fallbackMap) {
  if (segmentId === undefined || segmentId === null) return null;
  const key = String(segmentId);
  return fixture?.segmentRooms?.[key]
    ?? Object.entries(fallbackMap || {}).find(([, value]) => String(value) === key)?.[0]
    ?? null;
}

export class HALiveHub {
  constructor() {
    this.status = 'disconnected';
    this.entities = [];
    this.liveStates = {};
    this.vacuumSegmentMap = {};
    this.lastEventAt = null;
    this.lastSnapshotAt = null;
    this.clients = new Set();
    this.ws = null;
    this.manualDisconnect = false;
    this.reconnectAttempt = 0;
    this.msgId = 100;
    this.pendingMapsId = null;
    this.reconnectTimer = null;
    this.primaryVacuumEntityId = null;
    this.vacuumMapRefreshTimers = new Map();
    this.mockFixture = null;
  }

  nextId() {
    this.msgId += 1;
    return this.msgId;
  }

  getSnapshot() {
    return {
      status: this.status,
      reconnectAttempt: this.reconnectAttempt,
      lastEventAt: this.lastEventAt,
      lastSnapshotAt: this.lastSnapshotAt,
      entities: this.entities,
      liveStates: this.liveStates,
      vacuumSegmentMap: this.vacuumSegmentMap,
    };
  }

  registerClient(res) {
    this.clients.add(res);
    this.sendEvent(res, 'snapshot', this.getSnapshot());
    if (this.primaryVacuumEntityId) {
      this.scheduleVacuumMapRefresh(this.primaryVacuumEntityId, 250);
    }
    return () => {
      this.clients.delete(res);
    };
  }

  sendEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  broadcast(event, data) {
    for (const client of this.clients) {
      try {
        this.sendEvent(client, event, data);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  setStatus(status) {
    this.status = status;
    this.broadcast('ha-status', {
      status,
      reconnectAttempt: this.reconnectAttempt,
      lastEventAt: this.lastEventAt,
      lastSnapshotAt: this.lastSnapshotAt,
    });
  }

  applyFullState(states) {
    this.lastSnapshotAt = new Date().toISOString();
    this.entities = states.map(mapEntity);
    this.liveStates = Object.fromEntries(
      states.map((entity) => [entity.entity_id, { state: entity.state, attributes: entity.attributes || {} }])
    );
    this.primaryVacuumEntityId = findPrimaryVacuumEntityId(states);
    if (this.primaryVacuumEntityId) {
      this.scheduleVacuumMapRefresh(this.primaryVacuumEntityId, 0);
    }
    this.broadcast('snapshot', this.getSnapshot());
  }

  applyEntityUpdate(entityId, state, attributes = {}) {
    this.lastEventAt = new Date().toISOString();
    this.liveStates[entityId] = { state, attributes };
    const mapped = mapEntity({ entity_id: entityId, state, attributes });
    const existingIndex = this.entities.findIndex((entity) => entity.entityId === entityId);
    if (existingIndex >= 0) {
      this.entities[existingIndex] = mapped;
    } else {
      this.entities.push(mapped);
    }
    if (entityId.startsWith('vacuum.')) {
      if (!this.primaryVacuumEntityId) {
        this.primaryVacuumEntityId = entityId;
      }
      if (entityId === this.primaryVacuumEntityId) {
        this.scheduleVacuumMapRefresh(entityId);
      }
    }
    this.broadcast('entity-update', { entityId, state, attributes, entity: mapped });
  }

  scheduleVacuumMapRefresh(vacuumEntityId, delayMs = 1500) {
    if (!vacuumEntityId) return;
    const existingTimer = this.vacuumMapRefreshTimers.get(vacuumEntityId);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      this.vacuumMapRefreshTimers.delete(vacuumEntityId);
      this.refreshVacuumMap(vacuumEntityId).catch((err) => {
        console.warn('[HALiveHub] Scheduled vacuum map refresh failed:', err.message);
      });
    }, delayMs);
    this.vacuumMapRefreshTimers.set(vacuumEntityId, timer);
  }

  async refreshVacuumMap(vacuumEntityId) {
    try {
      const response = await this.callService('roborock', 'get_maps', {
        entity_id: vacuumEntityId,
      }, { returnResponse: true });
      const payload = response?.response ?? response;
      this.vacuumSegmentMap = parseVacuumSegmentMap(payload);
      this.broadcast('segment-map', { vacuumSegmentMap: this.vacuumSegmentMap });
    } catch (err) {
      console.warn('[HALiveHub] Failed to refresh vacuum map:', err.message);
    }
  }

  async loadMockFixture(fixturePath) {
    const raw = await readFile(fixturePath, 'utf8');
    const fixture = JSON.parse(raw);
    const entities = cloneJson(fixture.entities || []);
    const liveStates = fixture.liveStates ? cloneJson(fixture.liveStates) : buildLiveStatesFromEntities(entities);

    this.mockFixture = cloneJson(fixture);
    this.entities = entities;
    this.liveStates = liveStates;
    this.vacuumSegmentMap = cloneJson(fixture.vacuumSegmentMap || {});
    this.lastEventAt = new Date().toISOString();
    this.lastSnapshotAt = this.lastEventAt;
    this.reconnectAttempt = 0;
    this.primaryVacuumEntityId = fixture.primaryVacuumEntityId || findPrimaryVacuumEntityId(entities);
    this.setStatus(fixture.status || 'connected');
    this.broadcast('snapshot', this.getSnapshot());
  }

  updateMockEntity(entityId, state, attributes = {}) {
    const current = this.liveStates[entityId] || { state, attributes: {} };
    this.applyEntityUpdate(entityId, state ?? current.state, { ...current.attributes, ...attributes });
  }

  updateMockVacuumRoom(vacuumEntityId, roomName) {
    if (!roomName) return;
    const sensorEntityId = findMockRoomSensorEntityId(this.mockFixture, this.entities, vacuumEntityId);
    const vacuumState = this.liveStates[vacuumEntityId];
    if (vacuumState) {
      this.updateMockEntity(vacuumEntityId, vacuumState.state, { current_room: roomName });
    }
    if (sensorEntityId) {
      const sensorState = this.liveStates[sensorEntityId];
      this.updateMockEntity(sensorEntityId, roomName, { ...(sensorState?.attributes || {}), current_room: roomName });
    }
  }

  async callMockService(domain, service, serviceData = {}, options = {}) {
    if (domain === 'roborock' && service === 'get_maps') {
      return buildSegmentMapResponse(this.vacuumSegmentMap);
    }

    if (domain !== 'vacuum') {
      return { ok: true, mock: true, domain, service, data: serviceData, options };
    }

    const entityId = serviceData.entity_id;
    if (!entityId) {
      const err = new Error('Mock vacuum service requires entity_id');
      err.statusCode = 400;
      throw err;
    }

    const current = this.liveStates[entityId] || { state: 'docked', attributes: {} };
    const currentAttributes = current.attributes || {};

    switch (service) {
      case 'start':
      case 'clean_spot':
        this.updateMockEntity(entityId, 'cleaning', currentAttributes);
        break;
      case 'return_to_base':
        this.updateMockEntity(entityId, 'returning', currentAttributes);
        break;
      case 'pause':
        this.updateMockEntity(entityId, 'paused', currentAttributes);
        break;
      case 'stop':
        this.updateMockEntity(entityId, 'idle', currentAttributes);
        break;
      case 'set_fan_speed':
        this.updateMockEntity(entityId, current.state, { ...currentAttributes, fan_speed: serviceData.fan_speed });
        break;
      case 'send_command': {
        const command = serviceData.command;
        if (command === 'app_segment_clean') {
          const segmentId = Array.isArray(serviceData.params) ? serviceData.params[0] : undefined;
          const roomName = resolveMockRoomName(this.mockFixture, segmentId, this.vacuumSegmentMap);
          this.updateMockEntity(entityId, 'cleaning', {
            ...currentAttributes,
            ...(roomName ? { current_room: roomName } : {}),
          });
          this.updateMockVacuumRoom(entityId, roomName);
        }
        break;
      }
      default:
        break;
    }

    return { ok: true, mock: true, domain, service, data: serviceData, options };
  }

  async connect() {
    const mockFixturePath = getMockFixturePath();
    if (mockFixturePath) {
      this.manualDisconnect = false;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.ws?.close();
      this.ws = null;
      this.setStatus('connecting');
      await this.loadMockFixture(mockFixturePath);
      return;
    }

    this.mockFixture = null;
    const config = await getConfigWithSecurity();
    const baseUrl = config?.ha?.baseUrl;
    const token = config?.ha?.token;

    if (!baseUrl || !token) {
      this.manualDisconnect = true;
      this.ws?.close();
      this.ws = null;
      this.entities = [];
      this.liveStates = {};
      this.vacuumSegmentMap = {};
      this.setStatus('disconnected');
      return;
    }

    const wsUrl = buildWsUrl(baseUrl);
    this.manualDisconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus('connecting');

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempt = 0;
      };

      socket.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'auth_required':
            socket.send(JSON.stringify({ type: 'auth', access_token: token }));
            break;
          case 'auth_ok':
            this.setStatus('connected');
            socket.send(JSON.stringify({ type: 'get_states', id: this.nextId() }));
            socket.send(JSON.stringify({ type: 'subscribe_events', event_type: 'state_changed', id: this.nextId() }));
            break;
          case 'auth_invalid':
            this.setStatus('error');
            socket.close();
            break;
          case 'result':
            if (Array.isArray(msg.result)) {
              this.applyFullState(msg.result);
            }
            break;
          case 'event': {
            const newState = msg.event?.data?.new_state;
            if (msg.event?.event_type === 'state_changed' && newState?.entity_id) {
              this.applyEntityUpdate(newState.entity_id, newState.state, newState.attributes || {});
            }
            break;
          }
          default:
            break;
        }
      };

      socket.onerror = () => {
        this.setStatus('error');
      };

      socket.onclose = async () => {
        this.ws = null;
        if (this.manualDisconnect) {
          this.setStatus('disconnected');
          return;
        }
        this.setStatus('connecting');
        const backoffMs = Math.min(15000, 1000 * 2 ** this.reconnectAttempt);
        this.reconnectAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
          this.connect().catch((err) => console.warn('[HALiveHub] reconnect failed:', err.message));
        }, backoffMs);
      };
    } catch (err) {
      this.setStatus('error');
      await delay(1000);
      if (!this.manualDisconnect) {
        this.connect().catch((connectErr) => console.warn('[HALiveHub] delayed connect failed:', connectErr.message));
      }
    }
  }

  async reconnect() {
    await this.connect();
  }

  async callService(domain, service, serviceData = {}, options = {}) {
    if (this.mockFixture) {
      return this.callMockService(domain, service, serviceData, options);
    }

    const config = await getConfigWithSecurity();
    const baseUrl = config?.ha?.baseUrl;
    const token = config?.ha?.token;
    if (!baseUrl || !token) {
      const err = new Error('Home Assistant not configured');
      err.statusCode = 400;
      throw err;
    }
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/services/${domain}/${service}${options.returnResponse ? '?return_response' : ''}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serviceData),
    });
    if (!response.ok) {
      const detail = await response.text();
      const err = new Error(detail || `HA service failed with ${response.status}`);
      err.statusCode = response.status;
      throw err;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  async fetchCamera(entityId) {
    const config = await getConfigWithSecurity();
    const baseUrl = config?.ha?.baseUrl;
    const token = config?.ha?.token;
    if (!baseUrl || !token) {
      const err = new Error('Home Assistant not configured');
      err.statusCode = 400;
      throw err;
    }
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/camera_proxy/${entityId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = new Error(`Camera proxy failed with ${response.status}`);
      err.statusCode = response.status;
      throw err;
    }
    return response;
  }
}

export const haLiveHub = new HALiveHub();
