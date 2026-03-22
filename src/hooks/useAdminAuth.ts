import { useCallback, useEffect, useState } from 'react';
import {
  changeAdminPin,
  fetchAuthStatus,
  getMode,
  loginAdminPin,
  logoutAdmin,
  setupAdminPin,
  type AuthStatus,
} from '../lib/apiClient';

const AUTH_CHANGED_EVENT = 'bjorq-auth-changed';

export function emitAdminAuthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
  }
}

export function useAdminAuth() {
  const [status, setStatus] = useState<AuthStatus>({ configured: false, unlocked: true });
  const [loading, setLoading] = useState(getMode() === 'HOSTED');

  const refresh = useCallback(async () => {
    if (getMode() !== 'HOSTED') {
      setStatus({ configured: false, unlocked: true });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setStatus(await fetchAuthStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('bjorq-auth-required', handler);
    window.addEventListener(AUTH_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener('bjorq-auth-required', handler);
      window.removeEventListener(AUTH_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  const wrap = useCallback(async (fn: () => Promise<AuthStatus>) => {
    const next = await fn();
    setStatus(next);
    emitAdminAuthChanged();
    return next;
  }, []);

  return {
    status,
    loading,
    refresh,
    setup: (pin: string) => wrap(() => setupAdminPin(pin)),
    login: (pin: string) => wrap(() => loginAdminPin(pin)),
    logout: () => wrap(() => logoutAdmin()),
    changePin: (currentPin: string, nextPin: string) => wrap(() => changeAdminPin(currentPin, nextPin)),
  };
}
