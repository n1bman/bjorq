import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Reusable hook that polls a camera snapshot.
 *
 * Hosted mode: fetch blob via server proxy /api/ha/camera_proxy/{entityId}
 * DEV mode:    construct direct <img> URL from entityPicture (bypasses CORS)
 */
export function useCameraSnapshot(
  entityId: string | undefined,
  enabled: boolean,
  entityPicture?: string,
  intervalMs = 5000
): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const prevBlobRef = useRef<string | null>(null);
  const isHosted = useAppStore((s) => s._hostedMode);
  const wsUrl = useAppStore((s) => s.homeAssistant.wsUrl);
  const haStatus = useAppStore((s) => s.homeAssistant.status);

  // DEV mode: build direct URL from entityPicture (no fetch, no CORS issue)
  const buildDevUrl = useCallback(() => {
    if (!entityPicture || !wsUrl) return null;
    const httpBase = wsUrl.replace(/^ws/, 'http').replace(/\/api\/websocket$/, '');
    const separator = entityPicture.includes('?') ? '&' : '?';
    return `${httpBase}${entityPicture}${separator}t=${Date.now()}`;
  }, [entityPicture, wsUrl]);

  // Hosted mode: fetch blob via proxy
  const fetchHostedSnapshot = useCallback(async () => {
    if (!entityId) return;
    try {
      const url = `/api/ha/camera_proxy/${entityId}?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const newUrl = URL.createObjectURL(blob);
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = newUrl;
      setImageUrl(newUrl);
    } catch (err) {
      console.warn('[CameraSnapshot] Hosted fetch failed:', err);
    }
  }, [entityId]);

  useEffect(() => {
    if (!enabled || !entityId || haStatus !== 'connected') {
      setImageUrl(null);
      return;
    }

    if (isHosted) {
      // Hosted: fetch blob via proxy
      fetchHostedSnapshot();
      const timer = setInterval(fetchHostedSnapshot, intervalMs);
      return () => {
        clearInterval(timer);
        if (prevBlobRef.current) {
          URL.revokeObjectURL(prevBlobRef.current);
          prevBlobRef.current = null;
        }
      };
    } else {
      // DEV: direct URL refresh (no fetch, img tag bypasses CORS)
      const update = () => {
        const url = buildDevUrl();
        if (url) setImageUrl(url);
      };
      update();
      const timer = setInterval(update, intervalMs);
      return () => clearInterval(timer);
    }
  }, [enabled, entityId, haStatus, isHosted, fetchHostedSnapshot, buildDevUrl, intervalMs]);

  return imageUrl;
}
