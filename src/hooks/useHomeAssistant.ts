import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { HAEntity } from '../store/types';
import { isSuppressed } from './useHABridge';
import { callHAService, fetchLiveSnapshot, isHostedSync } from '../lib/apiClient';
import { createThrottledCaller } from '../lib/serviceThrottle';

let msgId = 10;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let manualDisconnect = false;
let hasAutoConnected = false;
let getMapsId: number | null = null;

function nextId() {
  return ++msgId;
}

export const haServiceCaller: { current: ((domain: string, service: string, data: Record<string, unknown>) => void) | null } = {
  current: null,
};

function applyHostedSnapshot(snapshot: {
  status: string;
  entities: HAEntity[];
  liveStates: Record<string, { state: string; attributes: Record<string, unknown> }>;
  vacuumSegmentMap?: Record<string, number>;
  transport?: 'live-stream' | 'fallback-poll';
}) {
  const s = useAppStore.getState();
  s.setHAStatus(snapshot.status as any);
  s.setHAEntities(snapshot.entities || []);
  s.markHASync(snapshot.transport || 'live-stream');
  if (snapshot.vacuumSegmentMap) {
    s.setVacuumSegmentMap(snapshot.vacuumSegmentMap);
  }
  for (const [entityId, value] of Object.entries(snapshot.liveStates || {})) {
    if (!isSuppressed(entityId)) {
      s.updateHALiveState(entityId, value.state, value.attributes || {});
    }
  }
}

function callService(domain: string, service: string, serviceData: Record<string, unknown>) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[HA] Cannot call service: not connected');
    return;
  }
  ws.send(JSON.stringify({
    type: 'call_service',
    domain,
    service,
    service_data: serviceData,
    id: nextId(),
  }));
}

function connect(url: string, token: string) {
  manualDisconnect = false;
  ws?.close();
  clearTimeout(reconnectTimer);

  let finalUrl = url.trim();
  if (finalUrl.startsWith('https://')) finalUrl = finalUrl.replace('https://', 'wss://');
  if (finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'ws://');
  if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);
  if (!finalUrl.endsWith('/api/websocket')) {
    finalUrl = `${finalUrl}/api/websocket`;
  }

  const store = useAppStore.getState();
  store.setHAConnection(finalUrl, token);
  store.setHAStatus('connecting');
  store.setHATransport('direct-websocket');

  try {
    const socket = new WebSocket(finalUrl);
    ws = socket;

    socket.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      const s = useAppStore.getState();

      switch (msg.type) {
        case 'auth_required':
          socket.send(JSON.stringify({ type: 'auth', access_token: token }));
          break;
        case 'auth_ok':
          s.setHAStatus('connected');
          s.markHASync('direct-websocket');
          haServiceCaller.current = createThrottledCaller(callService);
          socket.send(JSON.stringify({ type: 'get_states', id: nextId() }));
          socket.send(JSON.stringify({ type: 'subscribe_events', event_type: 'state_changed', id: nextId() }));
          break;
        case 'auth_invalid':
          s.setHAStatus('error');
          socket.close();
          break;
        case 'result':
          if (msg.id === getMapsId && msg.success) {
            getMapsId = null;
            break;
          }
          if (msg.success && Array.isArray(msg.result)) {
            const entities: HAEntity[] = msg.result.map((e: any) => ({
              entityId: e.entity_id,
              domain: e.entity_id.split('.')[0],
              friendlyName: e.attributes?.friendly_name || e.entity_id,
              state: e.state,
              attributes: e.attributes || {},
            }));
            s.setHAEntities(entities);
            s.markHASync('direct-websocket');
            for (const e of msg.result) {
              s.updateHALiveState(e.entity_id, e.state, e.attributes || {});
            }
          }
          break;
        case 'event':
          if (msg.event?.event_type === 'state_changed') {
            const newState = msg.event.data?.new_state;
            if (newState?.entity_id) {
              const entityId = newState.entity_id;
              if (isSuppressed(entityId)) break;
              s.markHASync('direct-websocket');
              s.updateHALiveState(entityId, newState.state, newState.attributes || {});
            }
          }
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      if (manualDisconnect) return;
      useAppStore.getState().setHAStatus('connecting');
      reconnectTimer = setTimeout(() => connect(url, token), 5000);
    };

    socket.onerror = () => {
      useAppStore.getState().setHAStatus('error');
    };
  } catch {
    useAppStore.getState().setHAStatus('error');
  }
}

function disconnect() {
  manualDisconnect = true;
  clearTimeout(reconnectTimer);
  haServiceCaller.current = null;
  useAppStore.getState().setHAStatus('disconnected');
  ws?.close();
  ws = null;
}

let hostedFallbackTimer: ReturnType<typeof setInterval> | undefined;

export function useHomeAssistant() {
  const pollStarted = useRef(false);

  useEffect(() => {
    if (!isHostedSync()) {
      if (hasAutoConnected) return;
      const { wsUrl, token, status } = useAppStore.getState().homeAssistant;
      if (wsUrl && token && status !== 'connected' && status !== 'connecting') {
        hasAutoConnected = true;
        connect(wsUrl, token);
      }
      return;
    }

    if (pollStarted.current) return;
    pollStarted.current = true;
    haServiceCaller.current = createThrottledCaller((domain, service, data) =>
      callHAService(domain, service, data).catch(console.warn)
    );

    let source: EventSource | null = null;
    let fallbackActive = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let lastStreamMessageAt = 0;

    const clearReconnectTimeout = () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    };

    const stopHeartbeatWatch = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    };

    const noteStreamActivity = () => {
      lastStreamMessageAt = Date.now();
      useAppStore.getState().markHASync('live-stream');
    };

    const fetchSnapshot = async () => {
      try {
        const snapshot = await fetchLiveSnapshot();
        const entities: HAEntity[] = (snapshot.entities || []).map((entity: any) => ({
          entityId: entity.entityId,
          domain: entity.domain,
          friendlyName: entity.friendlyName,
          state: entity.state,
          attributes: entity.attributes || {},
        }));
        applyHostedSnapshot({ ...snapshot, entities, transport: fallbackActive ? 'fallback-poll' : 'live-stream' });
      } catch (err) {
        const store = useAppStore.getState();
        if (store.homeAssistant.status === 'connected' || store.homeAssistant.status === 'degraded') {
          store.setHAStatus('connecting');
        }
      }
    };

    const startFallback = () => {
      if (fallbackActive) return;
      fallbackActive = true;
      const store = useAppStore.getState();
      if (store.homeAssistant.status !== 'error' && store.homeAssistant.status !== 'disconnected') {
        store.setHAStatus('degraded');
      }
      store.setHATransport('fallback-poll');
      fetchSnapshot().catch(() => {});
      hostedFallbackTimer = setInterval(fetchSnapshot, 10000);
    };

    const stopFallback = () => {
      fallbackActive = false;
      if (hostedFallbackTimer) clearInterval(hostedFallbackTimer);
      hostedFallbackTimer = undefined;
    };

    const scheduleStreamReconnect = () => {
      clearReconnectTimeout();
      reconnectTimeout = setTimeout(() => {
        connectHostedStream();
      }, 3000);
    };

    const connectHostedStream = () => {
      source?.close();
      source = new EventSource('/api/live/events');
      lastStreamMessageAt = Date.now();
      source.addEventListener('snapshot', (event) => {
        const snapshot = JSON.parse((event as MessageEvent).data);
        const entities: HAEntity[] = (snapshot.entities || []).map((entity: any) => ({
          entityId: entity.entityId,
          domain: entity.domain,
          friendlyName: entity.friendlyName,
          state: entity.state,
          attributes: entity.attributes || {},
        }));
        noteStreamActivity();
        applyHostedSnapshot({ ...snapshot, entities, transport: 'live-stream' });
      });
      source.addEventListener('entity-update', (event) => {
        const payload = JSON.parse((event as MessageEvent).data);
        noteStreamActivity();
        if (!isSuppressed(payload.entityId)) {
          useAppStore.getState().updateHALiveState(payload.entityId, payload.state, payload.attributes || {});
        }
      });
      source.addEventListener('ha-status', (event) => {
        const payload = JSON.parse((event as MessageEvent).data);
        noteStreamActivity();
        useAppStore.getState().setHAStatus(payload.status);
      });
      source.addEventListener('segment-map', (event) => {
        const payload = JSON.parse((event as MessageEvent).data);
        noteStreamActivity();
        useAppStore.getState().setVacuumSegmentMap(payload.vacuumSegmentMap || {});
      });
      source.addEventListener('ping', () => {
        noteStreamActivity();
      });
      source.onopen = () => {
        clearReconnectTimeout();
        stopFallback();
        useAppStore.getState().setHATransport('live-stream');
        fetchSnapshot().catch(() => {});
        stopHeartbeatWatch();
        heartbeatInterval = setInterval(() => {
          if (Date.now() - lastStreamMessageAt > 45000) {
            source?.close();
            startFallback();
            scheduleStreamReconnect();
          }
        }, 10000);
      };
      source.onerror = () => {
        startFallback();
        scheduleStreamReconnect();
      };
    };

    fetchSnapshot().finally(connectHostedStream);

    return () => {
      stopFallback();
      stopHeartbeatWatch();
      clearReconnectTimeout();
      source?.close();
      pollStarted.current = false;
      haServiceCaller.current = null;
    };
  }, []);

  const hostedCallService = (domain: string, service: string, serviceData: Record<string, unknown>) => {
    callHAService(domain, service, serviceData).catch(console.warn);
  };

  return {
    connect: isHostedSync() ? () => {} : connect,
    disconnect: isHostedSync() ? () => {} : disconnect,
    callService: isHostedSync() ? hostedCallService : callService,
  };
}
