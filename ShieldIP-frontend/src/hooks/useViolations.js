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
      let vios = [];
      if (data?.data?.violations && Array.isArray(data.data.violations)) vios = data.data.violations;
      else if (data?.data && Array.isArray(data.data)) vios = data.data;
      else if (Array.isArray(data)) vios = data;
      
      return vios.map(v => ({
        ...v,
        risk_score: Number(Math.min(100, Math.max(1, v.risk_score || (v.match_confidence * 100) || 1)).toFixed(1)),
        match_confidence: Number(Math.min(100, Math.max(1, (v.match_confidence > 1 ? v.match_confidence : v.match_confidence * 100) || 1)).toFixed(1)) / 100
      }));
    },
    retry: 1,
  });
}

export { };
