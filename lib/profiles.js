import { supabase } from './supabase';

export const NICKNAME_RULE = /^[0-9A-Za-z가-힣_]{2,12}$/;
export const NICKNAME_HINT = '한글·영문·숫자·_ 로 2~12자';

/** 닉네임 형식 검사. 문제가 있으면 안내 문구, 없으면 '' */
export const checkNickname = (nickname) => {
  const n = nickname.trim();
  if (n.length < 2 || n.length > 12) return '닉네임은 2~12자로 정해 주세요.';
  if (!NICKNAME_RULE.test(n)) return '닉네임은 한글, 영문, 숫자, _ 만 쓸 수 있어요.';
  return '';
};

/** 이미 쓰는 닉네임인지 (내 것은 제외) */
export const isNicknameTaken = async (nickname, myId) => {
  const { data } = await supabase.from('profiles').select('id').ilike('nickname', nickname.trim()).limit(1);
  return Boolean(data?.length && data[0].id !== myId);
};

export const getMyProfile = async (userId) => {
  const { data } = await supabase.from('profiles').select('id, nickname').eq('id', userId).maybeSingle();
  return data || null;
};

/** 내 닉네임 저장 (없으면 만들고 있으면 바꿈). 실패하면 안내 문구 */
export const saveNickname = async (userId, nickname) => {
  const problem = checkNickname(nickname);
  if (problem) return problem;
  if (await isNicknameTaken(nickname, userId)) return '이미 쓰고 있는 닉네임이에요.';
  const { error } = await supabase.from('profiles').upsert({ id: userId, nickname: nickname.trim() });
  if (error) {
    return error.code === '23505' ? '이미 쓰고 있는 닉네임이에요.' : `저장하지 못했어요: ${error.message}`;
  }
  return '';
};

/** 여러 사용자의 닉네임을 한 번에: { [userId]: nickname } */
export const getNicknames = async (userIds) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data } = await supabase.from('profiles').select('id, nickname').in('id', ids);
  return Object.fromEntries((data || []).map((p) => [p.id, p.nickname]));
};

/** 카드·정보 페이지에 보여줄 제작자 이름 */
export const creatorLabel = (character, nicknames) => {
  if (character.source === 'official') return '공식';
  if (!character.user_id) return null;
  return nicknames[character.user_id] || '알 수 없음';
};
