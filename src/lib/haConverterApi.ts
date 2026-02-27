/**
 * HTTP client for the HomeTwin Converter HA Add-on.
 * Communicates via HA ingress to upload OBJ/MTL/textures and download optimized GLB.
 */

import { useAppStore } from '@/store/useAppStore';

const ADDON_SLUG = 'hometwin_converter';

/** Derive HTTPS base URL from the stored wss:// WebSocket URL */
export function getHABaseUrl(): string | null {
  const wsUrl = useAppStore.getState().homeAssistant.wsUrl;
  if (!wsUrl) return null;

  let url = wsUrl.trim();
  // Strip /api/websocket suffix
  url = url.replace(/\/api\/websocket\/?$/, '');
  // Convert protocol
  if (url.startsWith('wss://')) url = url.replace('wss://', 'https://');
  else if (url.startsWith('ws://')) url = url.replace('ws://', 'http://');
  // Strip trailing slash
  if (url.endsWith('/')) url = url.slice(0, -1);

  return url;
}

function getToken(): string {
  return useAppStore.getState().homeAssistant.token;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function ingressBase(baseUrl: string): string {
  return `${baseUrl}/api/hassio_ingress/${ADDON_SLUG}`;
}

/** Check if the HomeTwin Converter add-on is reachable */
export async function checkAddonAvailable(baseUrl: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${ingressBase(baseUrl)}/health`, {
      headers: headers(token),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface UploadResult {
  jobId: string;
}

/** Upload a ZIP blob to the add-on for conversion */
export async function uploadForConversion(
  baseUrl: string,
  token: string,
  zipBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const url = `${ingressBase(baseUrl)}/convert`;

  // Use XMLHttpRequest for upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ jobId: data.jobId || data.job_id });
        } catch {
          reject(new Error('Ogiltigt svar från konverteraren'));
        }
      } else {
        reject(new Error(`Upload misslyckades (HTTP ${xhr.status}): ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Nätverksfel vid uppladdning till HomeTwin Converter'));
    xhr.ontimeout = () => reject(new Error('Timeout vid uppladdning'));
    xhr.timeout = 600_000; // 10 min for large files

    const formData = new FormData();
    formData.append('file', zipBlob, 'model.zip');
    xhr.send(formData);
  });
}

export interface ConversionStatus {
  state: 'queued' | 'converting' | 'done' | 'error';
  percent: number;
  message: string;
  error?: string;
}

/** Poll conversion status */
export async function pollConversionStatus(
  baseUrl: string,
  token: string,
  jobId: string,
): Promise<ConversionStatus> {
  const res = await fetch(`${ingressBase(baseUrl)}/status/${jobId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Status-förfrågan misslyckades (HTTP ${res.status})`);
  return res.json();
}

/** Download the resulting GLB blob */
export async function downloadResult(
  baseUrl: string,
  token: string,
  jobId: string,
): Promise<Blob> {
  const res = await fetch(`${ingressBase(baseUrl)}/result/${jobId}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`Nedladdning misslyckades (HTTP ${res.status})`);
  return res.blob();
}
