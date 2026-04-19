import { useQuery } from '@tanstack/react-query';
import { fetchViolations } from '../services/api';
import useAppStore from '../store/useAppStore';
import { useEffect } from 'react';

export default function useNotifications() {
  const { readNotificationIds, setUnreadCount } = useAppStore();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchViolations({ status: 'new' }),
    refetchInterval: 15000,
    staleTime: 8000,
    placeholderData: (prev) => prev,
    select: (data) => {
      if (data?.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
    retry: 1,
  });

  const items = query.data || [];
  const unread = items.filter((n) => !readNotificationIds.has(n.violation_id));

  useEffect(() => {
    setUnreadCount(unread.length);
  }, [unread.length, setUnreadCount]);

  return { ...query, items, unread, total: items.length };
}
