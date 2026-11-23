import { supabase } from './supabase';

export const MAX_REVIEW = 300;

/** 캐릭터들의 리뷰 통계: { [characterId]: { count, avg } } */
export const getStats = async (characterIds) => {
  const ids = [...new Set(characterIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('character_stats')
    .select('character_id, review_count, avg_rating')
    .in('character_id', ids);
  if (error) return {};
  return Object.fromEntries(data.map((s) => [s.character_id, { count: s.review_count, avg: s.avg_rating }]));
};

// 별점순 점수: 리뷰가 적으면 평균(3.5점) 쪽으로 당김 → 리뷰 1개짜리 5점이 1등이 되지 않게
const PRIOR_MEAN = 3.5;
const PRIOR_COUNT = 3;
export const rankScore = (stat) =>
  stat ? (stat.avg * stat.count + PRIOR_MEAN * PRIOR_COUNT) / (stat.count + PRIOR_COUNT) : 0;

export const getReviews = async (characterId) => {
  const { data } = await supabase
    .from('reviews')
    .select('id, user_id, rating, content, created_at, updated_at')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
};

/** 내 리뷰 저장 (있으면 수정). 실패하면 안내 문구 */
export const saveReview = async ({ characterId, userId, rating, content }) => {
  if (!(rating >= 1 && rating <= 5)) return '별점을 골라 주세요.';
  const text = (content || '').trim().slice(0, MAX_REVIEW) || null;
  const { error } = await supabase
    .from('reviews')
    .upsert(
      { character_id: characterId, user_id: userId, rating, content: text, updated_at: new Date().toISOString() },
      { onConflict: 'character_id,user_id' }
    );
  if (error) return `리뷰를 저장하지 못했어요: ${error.message}`;
  return '';
};

export const deleteReview = async (reviewId) => {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  return error ? `리뷰를 지우지 못했어요: ${error.message}` : '';
};
