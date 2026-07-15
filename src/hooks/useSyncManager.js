import { useState, useEffect } from 'react';
import syncManager from '../services/syncManager';

export function useSyncManager() {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSyncInfo();

    const unsubscribe = syncManager.addListener((status, data) => {
      setSyncStatus(status);
      
      if (status === 'success') {
        setError(null);
        loadSyncInfo();
      } else if (status === 'error') {
        setError(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadSyncInfo = async () => {
    try {
      const count = await syncManager.getPendingCount();
      const time = await syncManager.getLastSyncTime();
      setPendingCount(count);
      setLastSyncTime(time);
    } catch (err) {
      console.error('Failed to load sync info:', err);
    }
  };

  const triggerSync = async () => {
    try {
      await syncManager.manualSync();
    } catch (err) {
      setError(err);
    }
  };

  return {
    syncStatus,
    pendingCount,
    lastSyncTime,
    error,
    triggerSync,
    isSyncing: syncStatus === 'syncing',
  };
}
