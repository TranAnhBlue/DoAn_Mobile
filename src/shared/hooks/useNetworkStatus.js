import * as Network from 'expo-network';
import { useEffect, useRef, useState } from 'react';

/**
 * Hook trả về trạng thái mạng hiện tại.
 * @returns {{ isConnected: boolean | null, isLoading: boolean }}
 * - `null` = chưa xác định (lần đầu)
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsConnected(state.isConnected && state.isInternetReachable !== false);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setIsConnected(false);
          setIsLoading(false);
        }
      }
    };

    check();

    // Poll mỗi 5 giây vì expo-network không có event listener
    intervalRef.current = setInterval(check, 5000);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isConnected, isLoading };
}
