import { useState } from 'react';

export function useOfflineMutation(repositoryFn, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = async (variables) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await repositoryFn(variables);
      setData(result);

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      console.error('useOfflineMutation error:', err);
      setError(err);

      if (options.onError) {
        options.onError(err);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    mutate,
    isLoading,
    error,
    data,
    reset,
  };
}
