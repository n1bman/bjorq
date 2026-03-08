import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Reusable hook that polls a camera snapshot via camera_proxy.
 * Returns a blob URL for the latest snapshot image, or null.
 *
 * Hosted mode: GET /api/ha/camera_proxy/{entityId}
 * DEV mode:    GET {httpBase}/api/camera_proxy/{entityId} with Bearer token
 */
export function useCameraSnapshot(entityId: string | undefined, enabled: boolean, intervalMs = 5000): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prevBlobRef = useRef<string | null>(null);
  const isHosted = useAppStore((s) => s._hostedMode);
  const wsUrl = useAppStore((s) => s.homeAssistant.wsUrl);
  const haStatus = useAppStore((s) => s.homeAssistant.status);

  const fetchSnapshot = useCallback(async () => {
    if (!entityId || haStatus !== 'connected') return;

    try {
      let url: string;
      const headers: Record<string, string> = {};

      if (isHosted) {
        url = `/api/ha/camera_proxy/${entityId}?t=${Date.now()}`;
      } else {
        // Build HTTP base from wsUrl
        const httpBase = wsUrl.replace(/^ws/, 'http').replace(/\/api\/websocket$/, '');
        url = `${httpBase}/api/camera_proxy/${entityId}?t=${Date.now()}`;
        // In DEV mode we need the token from the store
        const token = useAppStore.getState().homeAssistant.token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${res.status}`);

      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);

      // Revoke previous blob
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
      prevBlobRef.current = newUrl;
      setBlobUrl(newUrl);
    } catch {
      // Keep last good snapshot or null
    }
  }, [entityId, haStatus, isHosted, wsUrl]);

  useEffect(() => {
    if (!enabled || !entityId) {
      setBlobUrl(null);
      return;
    }

    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, intervalMs);

    return () => {
      clearInterval(timer);
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
        prevBlobRef.current = null;
      }
    };
  }, [enabled, entityId, fetchSnapshot, intervalMs]);

  return blobUrl;
}
