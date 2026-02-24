import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { HAEntity } from '@/store/types';

import { isSuppressed } from './useHABridge';

let msgId = 10; // start above reserved IDs

function nextId() {
  return ++msgId;
}

/** Global ref so useHABridge can call services without being in the same component */
export const haServiceCaller: { current: ((domain: string, service: string, data: Record<string, unknown>) => void) | null } = {
  current: null,
};

/**
 * Hook that manages a real WebSocket connection to Home Assistant.
 * Call connect()/disconnect() from the UI.
 */
export function useHomeAssistant() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const manualDisconnect = useRef(false);

  const setHAStatus = useAppStore((s) => s.setHAStatus);
  const setHAEntities = useAppStore((s) => s.setHAEntities);
  const updateHALiveState = useAppStore((s) => s.updateHALiveState);
  const setHAConnection = useAppStore((s) => s.setHAConnection);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, []);

  const connect = useCallback((url: string, token: string) => {
    // Close existing
    manualDisconnect.current = false;
    wsRef.current?.close();
    clearTimeout(reconnectTimer.current);

    // Auto-fix URL format
    let finalUrl = url.trim();
    if (finalUrl.startsWith('https://')) finalUrl = finalUrl.replace('https://', 'wss://');
    if (finalUrl.startsWith('http://')) finalUrl = finalUrl.replace('http://', 'ws://');
    // Remove trailing slash before check
    if (finalUrl.endsWith('/')) finalUrl = finalUrl.slice(0, -1);
    if (!finalUrl.endsWith('/api/websocket')) {
      finalUrl = `${finalUrl}/api/websocket`;
    }

    console.log('[HA] Connecting to:', finalUrl);
    setHAConnection(finalUrl, token);
    setHAStatus('connecting');

    try {
      const ws = new WebSocket(finalUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[HA] WebSocket opened');
      };

      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'auth_required':
            // Send auth
            ws.send(JSON.stringify({ type: 'auth', access_token: token }));
            break;

          case 'auth_ok':
            console.log('[HA] Authenticated');
            setHAStatus('connected');
            // Request all states
            ws.send(JSON.stringify({ type: 'get_states', id: nextId() }));
            // Subscribe to state changes
            ws.send(JSON.stringify({ type: 'subscribe_events', event_type: 'state_changed', id: nextId() }));
            break;

          case 'auth_invalid':
            console.error('[HA] Auth invalid:', msg.message);
            setHAStatus('error');
            ws.close();
            break;

          case 'result':
            if (msg.success && Array.isArray(msg.result)) {
              // This is the get_states response
              const entities: HAEntity[] = msg.result.map((e: any) => ({
                entityId: e.entity_id,
                domain: e.entity_id.split('.')[0],
                friendlyName: e.attributes?.friendly_name || e.entity_id,
                state: e.state,
                attributes: e.attributes || {},
              }));
              setHAEntities(entities);

              // Also sync live states
              for (const e of msg.result) {
                updateHALiveState(e.entity_id, e.state, e.attributes || {});
              }
            }
            break;

          case 'event':
          if (msg.event?.event_type === 'state_changed') {
              const newState = msg.event.data?.new_state;
              if (newState) {
                const entityId = newState.entity_id;
                // Skip if we just sent a command for this entity (prevent feedback loop)
                if (isSuppressed(entityId)) {
                  console.log('[HA] Suppressing echo for', entityId);
                  break;
                }
                updateHALiveState(entityId, newState.state, newState.attributes || {});

                // Update entity in list
                const store = useAppStore.getState();
                const existing = store.homeAssistant.entities;
                const idx = existing.findIndex((e) => e.entityId === entityId);
                if (idx >= 0) {
                  const updated = [...existing];
                  updated[idx] = {
                    ...updated[idx],
                    state: newState.state,
                    attributes: newState.attributes || {},
                    friendlyName: newState.attributes?.friendly_name || updated[idx].friendlyName,
                  };
                  setHAEntities(updated);
                }
              }
            }
            break;
        }
      };

      ws.onerror = (err) => {
        console.error('[HA] WebSocket error:', err);
        setHAStatus('error');
      };

      ws.onclose = () => {
        console.log('[HA] WebSocket closed');
        if (manualDisconnect.current) return;
        const currentStatus = useAppStore.getState().homeAssistant.status;
        if (currentStatus === 'connected' || currentStatus === 'connecting') {
          setHAStatus('connecting');
          reconnectTimer.current = setTimeout(() => {
            console.log('[HA] Attempting reconnect...');
            connect(url, token);
          }, 5000);
        }
      };
    } catch (err) {
      console.error('[HA] Connection failed:', err);
      setHAStatus('error');
    }
  }, [setHAStatus, setHAEntities, updateHALiveState, setHAConnection]);

  const disconnect = useCallback(() => {
    manualDisconnect.current = true;
    clearTimeout(reconnectTimer.current);
    setHAStatus('disconnected');
    wsRef.current?.close();
    wsRef.current = null;
    // Clear entities
    setHAEntities([]);
    useAppStore.setState((s) => ({
      homeAssistant: { ...s.homeAssistant, liveStates: {} },
    }));
  }, [setHAStatus, setHAEntities]);

  const callService = useCallback((domain: string, service: string, serviceData: Record<string, unknown>) => {
    const ws = wsRef.current;
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
  }, []);

  // Expose callService globally for the bridge
  useEffect(() => {
    haServiceCaller.current = callService;
    return () => { haServiceCaller.current = null; };
  }, [callService]);

  return { connect, disconnect, callService };
}
