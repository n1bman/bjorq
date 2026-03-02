import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { HAEntity } from '../store/types';
import { isSuppressed } from './useHABridge';
import { isHostedSync, fetchHAStates, callHAService } from '../lib/apiClient';

// ── Module-level singleton state ──────────────────────────────────
let msgId = 10;
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let manualDisconnect = false;
let hasAutoConnected = false;
let getMapsId: number | null = null; // Track roborock.get_maps request ID

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
          haServiceCaller.current = isHostedSync()
            ? (domain, service, data) => callHAService(domain, service, data).catch(console.warn)
            : callService;
          socket.send(JSON.stringify({ type: 'get_states', id: nextId() }));
          socket.send(JSON.stringify({ type: 'subscribe_events', event_type: 'state_changed', id: nextId() }));
          // Request Roborock room mapping (will be handled in result handler)
          // Delay slightly to let entities load first
          setTimeout(() => {
            const entities = useAppStore.getState().homeAssistant.entities;
            const vacuumEntity = entities.find((e) => e.domain === 'vacuum');
            const vacuumId = vacuumEntity?.entityId || 'vacuum.s5_max';
            getMapsId = nextId();
            console.log('[HA] Requesting roborock.get_maps for', vacuumId, 'id:', getMapsId);
            socket.send(JSON.stringify({
              type: 'call_service',
              domain: 'roborock',
              service: 'get_maps',
              target: { entity_id: vacuumId },
              service_data: {},
              return_response: true,
              id: getMapsId,
            }));
          }, 2000);
          break;

        case 'auth_invalid':
          console.error('[HA] Auth invalid:', msg.message);
          s.setHAStatus('error');
          socket.close();
          break;

        case 'result':
          if (msg.id === getMapsId && msg.success) {
            // Parse roborock.get_maps response
            console.log('[HA] roborock.get_maps response:', msg.result);
            try {
              const response = msg.result?.response ?? msg.result;
              console.log('[HA] Raw roborock.get_maps response:', JSON.stringify(response).slice(0, 2000));
              const maps = response?.maps ?? response;
              const firstMap = Array.isArray(maps) ? maps[0] : maps;
              const rooms = firstMap?.rooms;
              console.log('[HA] Raw rooms object:', JSON.stringify(rooms));
              if (rooms && typeof rooms === 'object') {
                const segmentMap: Record<string, number> = {};
                // Handle multiple formats:
                // Format 1: { segmentId: { name: "Köket" } }
                // Format 2: { segmentId: "Köket" }
                // Format 3: [{ id: 17, name: "Köket" }]
                if (Array.isArray(rooms)) {
                  for (const entry of rooms) {
                    const name = entry?.name ?? entry?.label;
                    const id = entry?.id ?? entry?.segment_id ?? entry?.segmentId;
                    if (name && id !== undefined) {
                      segmentMap[name] = typeof id === 'number' ? id : parseInt(id);
                    }
                  }
                } else {
                  for (const [segId, val] of Object.entries(rooms)) {
                    const name = typeof val === 'string' ? val : (val as any)?.name ?? (val as any)?.label;
                    if (name) {
                      segmentMap[name] = parseInt(segId);
                    }
                  }
                }
                console.log('[HA] Vacuum segment map:', segmentMap);
                s.setVacuumSegmentMap(segmentMap);
                
                // Auto-fill segmentId on vacuum zones from segment map
                // Strategy: iterate segment map entries and find matching zones
                const floors = useAppStore.getState().layout.floors;
                for (const floor of floors) {
                  const zones = floor.vacuumMapping?.zones;
                  if (!zones) continue;
                  const floorRooms = floor.rooms ?? [];
                  
                  // First: try to match each segment map entry to a zone
                  for (const [segName, segId] of Object.entries(segmentMap)) {
                    const normalizedSeg = segName.toLowerCase().replace(/[-_\s]/g, '');
                    let matchedZone = zones.find((z) => {
                      const room = floorRooms.find((r) => r.id === z.roomId);
                      const displayName = room?.name ?? z.roomId;
                      const normalizedDisplay = displayName.toLowerCase().replace(/[-_\s]/g, '');
                      return normalizedDisplay === normalizedSeg 
                        || normalizedSeg.includes(normalizedDisplay) 
                        || normalizedDisplay.includes(normalizedSeg);
                    });
                    if (matchedZone) {
                      console.log('[HA] ✅ Auto-filling segmentId', segId, 'for zone', segName, '(roomId:', matchedZone.roomId, ')');
                      useAppStore.getState().updateVacuumZoneSegmentId(floor.id, matchedZone.roomId, segId);
                    }
                  }
                  
                  // Log any zones that didn't get a segmentId
                  for (const zone of zones) {
                    const updatedZones = useAppStore.getState().layout.floors.find(f => f.id === floor.id)?.vacuumMapping?.zones;
                    const updatedZone = updatedZones?.find(z => z.roomId === zone.roomId);
                    if (!updatedZone?.segmentId) {
                      const room = floorRooms.find((r) => r.id === zone.roomId);
                      console.warn('[HA] ❌ No segment match for zone:', room?.name ?? zone.roomId, '| Available segments:', Object.keys(segmentMap));
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('[HA] Failed to parse get_maps response:', err);
            }
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

let hostedPollTimer: ReturnType<typeof setInterval> | undefined;

export function useHomeAssistant() {
  const pollStarted = useRef(false);

  // In hosted mode: use REST polling via /api/ha/* proxy (no WebSocket, no token in browser)
  useEffect(() => {
    if (!isHostedSync()) {
      // Non-hosted: use WebSocket as before
      if (hasAutoConnected) return;
      const { wsUrl, token, status } = useAppStore.getState().homeAssistant;
      if (wsUrl && token && status !== 'connected' && status !== 'connecting') {
        hasAutoConnected = true;
        console.log('[HA] Auto-reconnecting with stored credentials');
        connect(wsUrl, token);
      }
      return;
    }

    // Hosted mode: poll HA states via server proxy
    if (pollStarted.current) return;
    pollStarted.current = true;

    const pollStates = async () => {
      try {
        const states = await fetchHAStates();
        if (!Array.isArray(states)) return;
        const s = useAppStore.getState();
        const entities: HAEntity[] = states.map((e: any) => ({
          entityId: e.entity_id,
          domain: e.entity_id.split('.')[0],
          friendlyName: e.attributes?.friendly_name || e.entity_id,
          state: e.state,
          attributes: e.attributes || {},
        }));
        s.setHAEntities(entities);
        s.setHAStatus('connected');
        for (const e of states) {
          if (!isSuppressed(e.entity_id)) {
            s.updateHALiveState(e.entity_id, e.state, e.attributes || {});
          }
        }
      } catch (err) {
        // HA not configured on server — that's fine, stay disconnected
        const s = useAppStore.getState();
        if (s.homeAssistant.status === 'connected') {
          s.setHAStatus('disconnected');
        }
      }
    };

    // Initial fetch + poll every 2s
    pollStates().then(() => {
      // After first successful poll, discover vacuum segments via REST
      const entities = useAppStore.getState().homeAssistant.entities;
      const vacuumEntity = entities.find((e) => e.domain === 'vacuum');
      if (vacuumEntity) {
        callHAService('roborock', 'get_maps', {
          entity_id: vacuumEntity.entityId,
          return_response: true,
        }).then(res => {
          if (!res.ok) return;
          return res.json();
        }).then(data => {
          if (!data) return;
          try {
            const response = data?.response ?? data;
            const maps = response?.maps ?? response;
            const firstMap = Array.isArray(maps) ? maps[0] : maps;
            const rooms = firstMap?.rooms;
            if (rooms && typeof rooms === 'object') {
              const segmentMap: Record<string, number> = {};
              if (Array.isArray(rooms)) {
                for (const entry of rooms) {
                  const name = entry?.name ?? entry?.label;
                  const id = entry?.id ?? entry?.segment_id ?? entry?.segmentId;
                  if (name && id !== undefined) {
                    segmentMap[name] = typeof id === 'number' ? id : parseInt(id);
                  }
                }
              } else {
                for (const [segId, val] of Object.entries(rooms)) {
                  const name = typeof val === 'string' ? val : (val as any)?.name ?? (val as any)?.label;
                  if (name) segmentMap[name] = parseInt(segId);
                }
              }
              console.log('[HA/Hosted] Vacuum segment map:', segmentMap);
              useAppStore.getState().setVacuumSegmentMap(segmentMap);

              // Auto-fill segmentId on vacuum zones
              const floors = useAppStore.getState().layout.floors;
              for (const floor of floors) {
                const zones = floor.vacuumMapping?.zones;
                if (!zones) continue;
                const floorRooms = floor.rooms ?? [];
                for (const [segName, segId] of Object.entries(segmentMap)) {
                  const normalizedSeg = segName.toLowerCase().replace(/[-_\s]/g, '');
                  const matchedZone = zones.find((z) => {
                    const room = floorRooms.find((r) => r.id === z.roomId);
                    const displayName = room?.name ?? z.roomId;
                    const normalizedDisplay = displayName.toLowerCase().replace(/[-_\s]/g, '');
                    return normalizedDisplay === normalizedSeg
                      || normalizedSeg.includes(normalizedDisplay)
                      || normalizedDisplay.includes(normalizedSeg);
                  });
                  if (matchedZone) {
                    useAppStore.getState().updateVacuumZoneSegmentId(floor.id, matchedZone.roomId, segId);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('[HA/Hosted] Failed to parse get_maps:', err);
          }
        }).catch(() => { /* roborock not available — fine */ });
      }
    });
    hostedPollTimer = setInterval(pollStates, 2000);

    return () => {
      if (hostedPollTimer) clearInterval(hostedPollTimer);
      pollStarted.current = false;
    };
  }, []);

  // In hosted mode, callService goes through REST proxy
  const hostedCallService = (domain: string, service: string, serviceData: Record<string, unknown>) => {
    callHAService(domain, service, serviceData).catch((err) =>
      console.warn('[HA] Service call failed:', err)
    );
  };

  return {
    connect: isHostedSync() ? () => {} : connect,
    disconnect: isHostedSync() ? () => {} : disconnect,
    callService: isHostedSync() ? hostedCallService : callService,
  };
}
