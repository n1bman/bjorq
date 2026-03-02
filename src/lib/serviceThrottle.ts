/**
 * Per-entity service call throttle + circuit breaker.
 *
 * - Max 10 calls/sec per entity (last-write-wins)
 * - Circuit breaker: if >5 errors in 10s → pause all calls for 5s and toast
 */

import { toast } from 'sonner';

// ── Per-entity throttle (last-write-wins) ──

interface PendingCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
  timer: ReturnType<typeof setTimeout>;
}

const pendingCalls = new Map<string, PendingCall>();
const MIN_INTERVAL_MS = 100; // max ~10 calls/sec per entity

// ── Circuit breaker ──

let errorCount = 0;
let errorWindowStart = 0;
let circuitOpen = false;
let circuitTimer: ReturnType<typeof setTimeout> | null = null;

const ERROR_THRESHOLD = 5;
const ERROR_WINDOW_MS = 10_000;
const CIRCUIT_COOLDOWN_MS = 5_000;

function recordError() {
  const now = Date.now();
  if (now - errorWindowStart > ERROR_WINDOW_MS) {
    errorCount = 0;
    errorWindowStart = now;
  }
  errorCount++;
  if (errorCount >= ERROR_THRESHOLD && !circuitOpen) {
    circuitOpen = true;
    toast.error('⚡ För många fel — pausar HA-anrop i 5 sek', {
      description: `${errorCount} fel på ${Math.round(ERROR_WINDOW_MS / 1000)}s`,
    });
    console.warn('[Throttle] Circuit breaker OPEN — pausing all HA calls');
    circuitTimer = setTimeout(() => {
      circuitOpen = false;
      errorCount = 0;
      console.log('[Throttle] Circuit breaker CLOSED — resuming');
    }, CIRCUIT_COOLDOWN_MS);
  }
}

function recordSuccess() {
  // Slowly decay error count on success
  if (errorCount > 0) errorCount = Math.max(0, errorCount - 1);
}

/**
 * Wrap a raw callService function with per-entity throttle + circuit breaker.
 */
export function createThrottledCaller(
  rawCaller: (domain: string, service: string, data: Record<string, unknown>) => void
): (domain: string, service: string, data: Record<string, unknown>) => void {
  return (domain: string, service: string, data: Record<string, unknown>) => {
    if (circuitOpen) {
      console.log('[Throttle] Circuit open — dropping call:', domain, service);
      return;
    }

    const entityId = (data.entity_id as string) || `${domain}.${service}`;

    // Cancel any pending call for this entity (last-write-wins)
    const existing = pendingCalls.get(entityId);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      pendingCalls.delete(entityId);
      try {
        rawCaller(domain, service, data);
        recordSuccess();
      } catch (err) {
        recordError();
        console.error('[Throttle] Service call error:', err);
      }
    }, MIN_INTERVAL_MS);

    pendingCalls.set(entityId, { domain, service, data, timer });
  };
}

/**
 * Check if the circuit breaker is currently open.
 */
export function isCircuitOpen(): boolean {
  return circuitOpen;
}

/**
 * Reset the circuit breaker manually.
 */
export function resetCircuitBreaker() {
  circuitOpen = false;
  errorCount = 0;
  if (circuitTimer) {
    clearTimeout(circuitTimer);
    circuitTimer = null;
  }
}

/**
 * Cleanup all pending throttled calls.
 */
export function clearAllPending() {
  for (const [, pending] of pendingCalls) {
    clearTimeout(pending.timer);
  }
  pendingCalls.clear();
}
