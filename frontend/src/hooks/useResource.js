import { useCallback, useEffect, useState } from 'react';

// Carga datos de un servicio y expone loading, error y reload.
export function useResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, reload };
}
