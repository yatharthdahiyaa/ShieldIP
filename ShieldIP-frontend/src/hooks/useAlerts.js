import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAlerts, markAlertRead, markAllAlertsRead } from '../services/api';

const SEED_ALERTS = [];

export default function useAlertsQuery(params = {}) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts(params),
    refetchInterval: 15000,
    staleTime: 10000,
    select: (data) => {
      const alerts = data?.data?.alerts || data?.alerts || [];
      return alerts;
    },
    placeholderData: SEED_ALERTS,
    retry: 1,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => markAlertRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
