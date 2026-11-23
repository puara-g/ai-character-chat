import { supabase } from './supabase';
import { buildProfile } from './kakao';

export const MAX_MEMORIES = 20;

// 단계: 연애 단계(설렘·특별한 사이)는 19세 이상 캐릭터에서만, 나머지는 우정 단계
const LEVELS = [
  { min: 0, name: '낯선 사이' },
  { min: 20, name: '아는 사이' },
  { min: 40, name: '친구' },
  { min: 60, name: '설렘', friendName: '절친' },
  { min: 80, name: '특별한 사이', friendName: '베스트 프렌드' },
];

/** 연애 느낌 단계를 써도 되는 캐릭터인지: 19세 이상으로 설정 + 실제 사람 흉내(카톡) 아님 */
export const romanceAllowed = (character) =>
  character?.source !== 'kakao' && /^\d+$/.test(String(character?.age ?? '')) && Number(character.age) >= 19;

export const levelOf = (score, romance) => {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (score >= l.min) idx = i;
  });
  const l = LEVELS[idx];
  const next = LEVELS[idx + 1];
  return { index: idx, name: romance ? l.name : l.friendName || l.name, min: l.min, nextMin: next ? next.min : 100 };
};

export const clampScore = (n) => Math.max(0, Math.min(100, Math.round(n)));

/** 새 기억을 합침: 중복 빼고 최근 것 위주로 최대 20개 */
export const mergeMemories = (old, add) => {
  const list = [...(old || [])];
  for (const m of add || []) {
    const t = String(m).trim().slice(0, 60);
    if (t && !list.some((x) => x === t)) list.push(t);
  }
  return list.slice(-MAX_MEMORIES);
};

/** 내 메시지들로 말투 요약 (5개 이상일 때) */
export const computeUserStyle = (messages) => {
  const mine = messages.filter((m) => m.sender === 'user').slice(-40);
  if (mine.length < 5) return null;
  const list = mine.map((m) => ({ name: 'me', text: m.content }));
  const polite = mine.filter((m) => /(요|니다|세요)[.!?~ㅎㅋ]*$/.test(m.content.trim())).length / mine.length;
  const summary = buildProfile(list, 'me').styleSummary;
  return [polite > 0.5 ? '주로 존댓말' : '주로 반말', summary].filter(Boolean).join(' / ');
};

// ---------- 저장: 로그인하면 DB, 체험 모드면 이 탭에만 ----------
const guestKey = (characterId) => `guest_affinity_${characterId}`;
const EMPTY = { enabled: false, score: 0, memories: [], user_style: null };

export const loadAffinity = async ({ userId, characterId }) => {
  if (!userId) {
    try {
      return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(guestKey(characterId)) || '{}') };
    } catch {
      return { ...EMPTY };
    }
  }
  const { data } = await supabase
    .from('affinities')
    .select('enabled, score, memories, user_style')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();
  return data ? { ...EMPTY, ...data } : { ...EMPTY };
};

export const saveAffinity = async ({ userId, characterId, affinity }) => {
  const row = {
    enabled: affinity.enabled,
    score: clampScore(affinity.score),
    memories: affinity.memories || [],
    user_style: affinity.user_style || null,
  };
  if (!userId) {
    try {
      sessionStorage.setItem(guestKey(characterId), JSON.stringify(row));
    } catch {}
    return '';
  }
  const { error } = await supabase
    .from('affinities')
    .upsert({ user_id: userId, character_id: characterId, ...row, updated_at: new Date().toISOString() });
  return error ? error.message : '';
};
