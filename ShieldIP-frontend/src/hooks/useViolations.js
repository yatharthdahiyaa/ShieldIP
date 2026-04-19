import { useQuery } from '@tanstack/react-query';
import { fetchViolations } from '../services/api';

const SEED_VIOLATIONS = [
  { violation_id: 'V-1001', platform: 'YouTube', url: 'youtube.com/watch?v=mock1', match_confidence: 0.99, region: 'North America', detected_at: new Date(Date.now() - 10000).toISOString(), risk_score: 92, threat_level: 'critical', status: 'new', variant_type: 'direct_reupload', account_type: 'unofficial', chain_position: 1, source_type: 'origin', brand_misuse: false },
  { violation_id: 'V-1002', platform: 'TikTok', url: 'tiktok.com/@user/video/mock2', match_confidence: 0.85, region: 'Asia Pacific', detected_at: new Date(Date.now() - 25000).toISOString(), risk_score: 78, threat_level: 'high', status: 'new', variant_type: 'clipped_highlight', account_type: 'unofficial', chain_position: 2, source_type: 'repost', brand_misuse: false },
  { violation_id: 'V-1003', platform: 'Instagram', url: 'instagram.com/p/mock3', match_confidence: 0.95, region: 'Europe', detected_at: new Date(Date.now() - 45000).toISOString(), risk_score: 88, threat_level: 'critical', status: 'scored', variant_type: 'meme_edit', account_type: 'unofficial', chain_position: 3, source_type: 'repost', brand_misuse: true },
  { violation_id: 'V-1004', platform: 'X', url: 'x.com/user/status/mock4', match_confidence: 0.75, region: 'Global', detected_at: new Date(Date.now() - 60000).toISOString(), risk_score: 60, threat_level: 'medium', status: 'enforced', variant_type: 'mirrored', account_type: 'official', chain_position: 4, source_type: 'repost', brand_misuse: false },
  { violation_id: 'V-1005', platform: 'Twitch', url: 'twitch.tv/videos/mock5', match_confidence: 0.92, region: 'South America', detected_at: new Date(Date.now() - 80000).toISOString(), risk_score: 85, threat_level: 'high', status: 'new', variant_type: 'cropped', account_type: 'unofficial', chain_position: 5, source_type: 'repost', brand_misuse: false },
  { violation_id: 'V-1006', platform: 'Dailymotion', url: 'dailymotion.com/video/mock6', match_confidence: 0.88, region: 'Europe', detected_at: new Date(Date.now() - 120000).toISOString(), risk_score: 70, threat_level: 'high', status: 'scored', variant_type: 'colour_graded', account_type: 'unofficial', chain_position: 6, source_type: 'repost', brand_misuse: false },
  { violation_id: 'V-1007', platform: 'YouTube', url: 'youtube.com/watch?v=mock7', match_confidence: 0.97, region: 'North America', detected_at: new Date(Date.now() - 200000).toISOString(), risk_score: 95, threat_level: 'critical', status: 'new', variant_type: 'direct_reupload', account_type: 'unofficial', chain_position: 1, source_type: 'origin', brand_misuse: false },
  { violation_id: 'V-1008', platform: 'Instagram', url: 'instagram.com/p/mock8', match_confidence: 0.72, region: 'Asia Pacific', detected_at: new Date(Date.now() - 300000).toISOString(), risk_score: 55, threat_level: 'medium', status: 'enforced', variant_type: 'meme_edit', account_type: 'rights_holder', chain_position: 2, source_type: 'repost', brand_misuse: true },
];

export default function useViolationsQuery(params = {}) {
  return useQuery({
    queryKey: ['violations', params],
    queryFn: () => fetchViolations(params),
    refetchInterval: 10000,
    staleTime: 5000,
    placeholderData: (prev) => prev,
    select: (data) => {
      if (data?.data && Array.isArray(data.data)) return data.data;
      if (Array.isArray(data)) return data;
      return SEED_VIOLATIONS;
    },
    retry: 1,
    meta: { fallback: SEED_VIOLATIONS },
  });
}

export { SEED_VIOLATIONS };
