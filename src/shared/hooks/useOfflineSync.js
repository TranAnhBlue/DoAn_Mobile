import { useEffect, useRef } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';

import { offlineQueue } from '../services/offlineQueue';
import { syncAllPendingLogs } from '../services/syncDailyLogs';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Hook tự động sync offline queue khi mạng trở lại.
 * Đặt ở root App để luôn lắng nghe.
 *
 * Sync được kích hoạt khi:
 * 1. App khởi động và đã có mạng + có dữ liệu trong queue (null → true)
 * 2. Thiết bị kết nối lại mạng (false → true)
 */
export function useOfflineSync() {
  const { isConnected } = useNetworkStatus();
  const prevConnected = useRef(null); // null = chưa xác định
  const isSyncing = useRef(false);

  useEffect(() => {
    if (isConnected === null) return; // Chưa biết trạng thái mạng, bỏ qua

    const prev = prevConnected.current;
    prevConnected.current = isConnected;

    // Sync khi:
    // - Lần đầu tiên xác định mạng và đang có mạng (null → true)
    // - Vừa có mạng trở lại (false → true)
    const shouldSync = isConnected === true && prev !== true;

    if (!shouldSync || isSyncing.current) return;

    const runSync = async () => {
      const pending = await offlineQueue.count();
      if (!pending) return; // Không có gì trong queue

      isSyncing.current = true;
      try {
        const { synced, failed, skipped } = await syncAllPendingLogs();

        if (synced > 0) {
          const msg = `Đã đồng bộ ${synced} ghi chép offline${failed > 0 ? `, ${failed} thất bại` : ''}.`;
          if (Platform.OS === 'android') {
            ToastAndroid.show(msg, ToastAndroid.LONG);
          } else {
            Alert.alert('Đồng bộ hoàn tất', msg);
          }
        }

        if (skipped > 0) {
          Alert.alert(
            'Một số ghi chép không thể gửi',
            `${skipped} ghi chép đã thử 3 lần nhưng thất bại. Vui lòng liên hệ quản trị viên.`
          );
        }
      } finally {
        isSyncing.current = false;
      }
    };

    runSync();
  }, [isConnected]);
}
