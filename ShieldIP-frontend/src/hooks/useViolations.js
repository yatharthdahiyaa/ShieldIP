import { useQuery } from '@tanstack/react-query';
import { fetchViolations } from '../services/api';

export default function useViolationsQuery(params = {}) {
  return useQuery({
    queryKey: ['violations', params],
    queryFn: () => fetchViolations(params),
    refetchInterval: 10000,
    staleTime: 5000,
    placeholderData: (prev) => prev,
    select: (data) => {
      // API returns { success, data: { violations: [], page, page_size } }
      if (data?.data?.violations && Array.isArray(data.data.violations)) return data.data.violations;
      if (data?.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
      return [];
    },
    retry: 1,
  });
}

export { };
