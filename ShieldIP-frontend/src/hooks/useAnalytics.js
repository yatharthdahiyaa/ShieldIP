import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsSummary, fetchAnalyticsByPlatform } from '../services/api';

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
    refetchInterval: 30000,
    staleTime: 15000,
    placeholderData: (prev) => prev,
    select: (data) => (data?.data ? data.data : data || null),
    retry: 1,
  });
}

export function useAnalyticsByPlatform() {
  return useQuery({
    queryKey: ['analytics', 'platform'],
    queryFn: fetchAnalyticsByPlatform,
    refetchInterval: 30000,
    staleTime: 15000,
    placeholderData: (prev) => prev,
    select: (data) => {
      if (data?.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
    retry: 1,
  });
}

export { };
