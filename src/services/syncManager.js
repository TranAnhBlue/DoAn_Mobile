import NetInfo from '@react-native-community/netinfo';
import { syncRepository } from '../repositories/syncRepository';
import { bootstrapRepository } from '../repositories/bootstrapRepository';
import api from '../api/api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = [];
    this.unsubscribeNetwork = null;
  }

  initialize() {
    console.log('🔄 SyncManager initialized');
    
    this.unsubscribeNetwork = NetInfo.addEventListener(state => {
      console.log('📡 Network state:', state.isConnected ? 'Online' : 'Offline');
      
      if (state.isConnected && !this.isSyncing) {
        setTimeout(() => this.runSync(), 1000);
      }
    });
  }

  async runSync() {
    if (this.isSyncing) {
      console.log('⏸️ Sync already in progress, skipping...');
      return;
    }
    
    this.isSyncing = true;
    console.log('🔄 Starting sync...');
    this.notifyListeners('syncing', null);

    try {
      const cursors = await syncRepository.getSyncCursors();
      console.log('📍 Current sync cursors:', cursors);

      const bootstrapResponse = await api.post('/mobile/bootstrap', { 
        cursors,
        user_id: global.currentUserId 
      });
      
      if (bootstrapResponse.data?.data) {
        await bootstrapRepository.applyServerChanges(bootstrapResponse.data.data);
        console.log('✅ Bootstrap sync completed');
      }

      const pendingOps = await syncRepository.getPendingOperations(25);
      console.log(`📤 Pending operations: ${pendingOps.length}`);

      if (pendingOps.length > 0) {
        const bulkResponse = await api.post('/sync/bulk', {
          operations: pendingOps
        });
        
        if (bulkResponse.data?.results) {
          await syncRepository.updateSyncResults(bulkResponse.data.results);
          console.log('✅ Bulk sync completed');
        }
      }

      await syncRepository.clearSyncedOperations(7);

      console.log('✅ Full sync completed successfully');
      this.notifyListeners('success', {
        timestamp: new Date().toISOString(),
        operationsSynced: pendingOps.length
      });
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      this.notifyListeners('error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async manualSync() {
    console.log('🔄 Manual sync triggered');
    return this.runSync();
  }

  async getPendingCount() {
    return await syncRepository.getPendingCount();
  }

  async getLastSyncTime() {
    const result = await syncRepository.getSyncCursors();
    const timestamps = Object.values(result);
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status, data) {
    this.listeners.forEach(cb => {
      try {
        cb(status, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  destroy() {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
      this.unsubscribeNetwork = null;
    }
    this.listeners = [];
    console.log('🔒 SyncManager destroyed');
  }
}

export default new SyncManager();
