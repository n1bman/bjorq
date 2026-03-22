import { setTimeout as delay } from 'timers/promises';
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
  const response = payload?.response ?? payload;
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

class HALiveHub {
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
    this.broadcast('entity-update', { entityId, state, attributes, entity: mapped });
  }

  async refreshVacuumMap(vacuumEntityId) {
    try {
      const response = await this.callService('roborock', 'get_maps', {
        entity_id: vacuumEntityId,
        return_response: true,
      });
      const payload = response?.response ?? response;
      this.vacuumSegmentMap = parseVacuumSegmentMap(payload);
      this.broadcast('segment-map', { vacuumSegmentMap: this.vacuumSegmentMap });
    } catch (err) {
      console.warn('[HALiveHub] Failed to refresh vacuum map:', err.message);
    }
  }

  async connect() {
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
              const vacuum = msg.result.find((entity) => entity.entity_id?.startsWith('vacuum.'));
              if (vacuum) {
                await this.refreshVacuumMap(vacuum.entity_id);
              }
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

  async callService(domain, service, serviceData = {}) {
    const config = await getConfigWithSecurity();
    const baseUrl = config?.ha?.baseUrl;
    const token = config?.ha?.token;
    if (!baseUrl || !token) {
      const err = new Error('Home Assistant not configured');
      err.statusCode = 400;
      throw err;
    }
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/services/${domain}/${service}`, {
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
