import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '../services/api';
import useAppStore from '../store/useAppStore';
import { useEffect } from 'react';

export default function useNotifications() {
  const { setUnreadCount } = useAppStore();

  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts({ limit: 50 }),
    refetchInterval: 15000,
    staleTime: 8000,
    placeholderData: (prev) => prev,
    select: (data) => {
      const alerts = data?.data?.alerts || data?.alerts || [];
      return alerts;
    },
    retry: 1,
  });

  const items = query.data || [];
  const unread = items.filter((n) => !n.read);

  useEffect(() => {
    setUnreadCount(unread.length);
  }, [unread.length, setUnreadCount]);

  return { ...query, items, unread, total: items.length };
}
