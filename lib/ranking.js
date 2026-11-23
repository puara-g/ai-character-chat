import { supabase } from './supabase';

export const PERIODS = [
  { value: 24, label: '실시간', desc: '최근 24시간 대화 기준' },
  { value: 168, label: '주간', desc: '최근 7일 대화 기준' },
];

/** 기간 안에 대화한 사람 수·메시지 수: { [characterId]: { chatters, messages } } (실패하면 null) */
export const getActivity = async (hours) => {
  const { data, error } = await supabase.rpc('character_ranking', { window_hours: hours, max_rows: 100 });
  if (error) {
    console.error('랭킹 불러오기 실패:', error);
    return null;
  }
  return Object.fromEntries(data.map((r) => [r.character_id, { chatters: r.chatters, messages: r.messages }]));
};

/** "방금 업데이트", "3분 전 업데이트" */
export const updatedLabel = (at, now = Date.now()) => {
  if (!at) return '';
  const min = Math.floor((now - at) / 60000);
  return min < 1 ? '방금 업데이트' : `${min}분 전 업데이트`;
};
