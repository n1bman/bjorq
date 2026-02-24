import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { HAEntity } from '@/store/types';
import { isSuppressed } from './useHABridge';

// ── Module-level singleton state ──────────────────────────────────
let msgId = 10;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let manualDisconnect = false;
let hasAutoConnected = false;

function nextId() {
  return ++msgId;
}

/** Global ref so useHABridge can call services without being in the same component */
export const haServiceCaller: { current: ((domain: string, service: string, data: Record<string, unknown>) => void) | null } = {
  current: null,
};

// ── Module-level functions (singleton) ────────────────────────────

function callService(domain: string, service: string, serviceData: Record<string, unknown>) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[HA] Cannot call service: not connected');
    return;
  }
  console.log('[HA] Calling service:', domain, service, serviceData);
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
  console.log('[HA] Connecting to:', finalUrl);
  store.setHAConnection(finalUrl, token);
  store.setHAStatus('connecting');

  try {
    const socket = new WebSocket(finalUrl);
    ws = socket;

    socket.onopen = () => {
      console.log('[HA] WebSocket opened');
    };

    socket.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); } catch { return; }

      const s = useAppStore.getState();

      switch (msg.type) {
        case 'auth_required':
          socket.send(JSON.stringify({ type: 'auth', access_token: token }));
          break;

        case 'auth_ok':
          console.log('[HA] Authenticated');
          s.setHAStatus('connected');
          // Set global caller immediately
          haServiceCaller.current = callService;
          socket.send(JSON.stringify({ type: 'get_states', id: nextId() }));
          socket.send(JSON.stringify({ type: 'subscribe_events', event_type: 'state_changed', id: nextId() }));
          break;

        case 'auth_invalid':
          console.error('[HA] Auth invalid:', msg.message);
          s.setHAStatus('error');
          socket.close();
          break;

        case 'result':
          if (msg.success && Array.isArray(msg.result)) {
            const entities: HAEntity[] = msg.result.map((e: any) => ({
              entityId: e.entity_id,
              domain: e.entity_id.split('.')[0],
              friendlyName: e.attributes?.friendly_name || e.entity_id,
              state: e.state,
              attributes: e.attributes || {},
            }));
            s.setHAEntities(entities);
            for (const e of msg.result) {
              s.updateHALiveState(e.entity_id, e.state, e.attributes || {});
            }
          }
          break;

        case 'event':
          if (msg.event?.event_type === 'state_changed') {
            const newState = msg.event.data?.new_state;
            if (newState) {
              const entityId = newState.entity_id;
              if (isSuppressed(entityId)) {
                console.log('[HA] Suppressing echo for', entityId);
                break;
              }
              s.updateHALiveState(entityId, newState.state, newState.attributes || {});
              const existing = s.homeAssistant.entities;
              const idx = existing.findIndex((e) => e.entityId === entityId);
              if (idx >= 0) {
                const updated = [...existing];
                updated[idx] = {
                  ...updated[idx],
                  state: newState.state,
                  attributes: newState.attributes || {},
                  friendlyName: newState.attributes?.friendly_name || updated[idx].friendlyName,
                };
                s.setHAEntities(updated);
              }
            }
          }
          break;
      }
    };

    socket.onerror = (err) => {
      console.error('[HA] WebSocket error:', err);
      useAppStore.getState().setHAStatus('error');
    };

    socket.onclose = () => {
      console.log('[HA] WebSocket closed');
      if (manualDisconnect) return;
      const currentStatus = useAppStore.getState().homeAssistant.status;
      if (currentStatus === 'connected' || currentStatus === 'connecting') {
        useAppStore.getState().setHAStatus('connecting');
        reconnectTimer = setTimeout(() => {
          console.log('[HA] Attempting reconnect...');
          connect(url, token);
        }, 5000);
      }
    };
  } catch (err) {
    console.error('[HA] Connection failed:', err);
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
  useAppStore.getState().setHAEntities([]);
  useAppStore.setState((s) => ({
    homeAssistant: { ...s.homeAssistant, liveStates: {} },
  }));
}

// ── React hook (thin wrapper) ─────────────────────────────────────

export function useHomeAssistant() {
  // Auto-reconnect on first mount if stored credentials exist
  useEffect(() => {
    if (hasAutoConnected) return;
    const { wsUrl, token, status } = useAppStore.getState().homeAssistant;
    if (wsUrl && token && status !== 'connected' && status !== 'connecting') {
      hasAutoConnected = true;
      console.log('[HA] Auto-reconnecting with stored credentials');
      connect(wsUrl, token);
    }
  }, []);

  return { connect, disconnect, callService };
}
