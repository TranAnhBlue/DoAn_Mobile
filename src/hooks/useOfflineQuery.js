import { useState, useEffect } from 'react';

export function useOfflineQuery(key, repositoryFn, options = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await repositoryFn();
      setData(result);
    } catch (err) {
      console.error(`useOfflineQuery [${key}] error:`, err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [key]);

  const refetch = () => fetchData(true);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
