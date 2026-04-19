import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsSummary, fetchAnalyticsByPlatform } from '../services/api';

const SEED_SUMMARY = {
  total_assets: 847,
  total_violations: 234,
  total_enforcements: 189,
  revenue_recovered: 42300,
  dmca_success_rate: 0.87,
  avg_risk_score: 72,
  violations_this_week: 34,
  resolved_this_week: 28,
};

const SEED_PLATFORM = [
  { platform: 'YouTube',    violations: 78, revenue_recovered: 15200 },
  { platform: 'TikTok',     violations: 56, revenue_recovered: 9800 },
  { platform: 'Instagram',  violations: 42, revenue_recovered: 7600 },
  { platform: 'X',          violations: 31, revenue_recovered: 5100 },
  { platform: 'Twitch',     violations: 18, revenue_recovered: 3200 },
  { platform: 'Dailymotion', violations: 9, revenue_recovered: 1400 },
];

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: fetchAnalyticsSummary,
    refetchInterval: 30000,
    staleTime: 15000,
    placeholderData: (prev) => prev,
    select: (data) => (data?.data ? data.data : data || SEED_SUMMARY),
    retry: 1,
    meta: { fallback: SEED_SUMMARY },
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
      return SEED_PLATFORM;
    },
    retry: 1,
    meta: { fallback: SEED_PLATFORM },
  });
}

export { SEED_SUMMARY, SEED_PLATFORM };
