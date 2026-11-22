-- 카톡 대화로 만든 캐릭터
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

alter table public.characters
  add column if not exists source text,          -- 'kakao' 이면 카톡 대화로 만든 캐릭터
  add column if not exists style jsonb,          -- { examples: [...], summary, multiBubble }
  add column if not exists memory_pairs jsonb;   -- [{ q, a, v }] 상대 말 → 실제 대답 (v: 의미 벡터)

-- 실제 사람의 말투·대화가 담겨 있으므로 카톡 캐릭터는 공개할 수 없음
alter table public.characters drop constraint if exists kakao_characters_private;
alter table public.characters
  add constraint kakao_characters_private check (source is distinct from 'kakao' or is_public = false);
