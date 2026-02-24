import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';

export interface OnlineStatus {
  isOnline: boolean;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

export function useOnlineStatus() {
  const [status, setStatus] = useState<OnlineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineAt: null,
    lastOfflineAt: null,
  });
  
  const showToast = useStore(state => state.showToast);

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnlineAt: Date.now(),
    }));
    showToast('Back online - syncing changes...', 'success');
  }, [showToast]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOfflineAt: Date.now(),
    }));
    showToast('You\'re offline - changes will sync when reconnected', 'warning');
  }, [showToast]);

  useEffect(() => {
    // Set initial state
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnlineAt: navigator.onLine ? Date.now() : null,
    }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}
