import { useCallback, useEffect, useState } from 'react';
import { cooperativeApi } from '../services/cooperativeApi';
import { memberApi } from '../services/memberApi';
import { reconciliationApi } from '../services/reconciliationApi';
import { getApiError } from '../lib/api';
import { usePaymentEvents } from './usePaymentEvents';

export const useDashboardData = () => {
  const [data, setData] = useState({
    cooperatives: [],
    members: [],
    reconciliation: {
      summary: { matchedCount: 0, missingCount: 0, failedCount: 0, totalMatched: 0 },
      matched_transactions: [],
      missing_transactions: [],
      failed_transactions: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [cooperatives, members, reconciliation] = await Promise.all([
        cooperativeApi.list(),
        memberApi.list(),
        reconciliationApi.get()
      ]);

      setData({ cooperatives, members, reconciliation });
    } catch (loadError) {
      setError(getApiError(loadError, 'Unable to load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  usePaymentEvents(load);

  return {
    ...data,
    loading,
    error,
    reload: load
  };
};
