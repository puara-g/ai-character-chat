-- 호감도 모드: 사람×캐릭터마다 호감도 점수, 캐릭터가 기억하는 것, 내 말투 요약
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

create table if not exists public.affinities (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  enabled boolean not null default true,          -- 대화방에서 호감도 모드를 켰는지
  score smallint not null default 0 check (score between 0 and 100),
  memories jsonb not null default '[]'::jsonb,    -- ["이름은 민수", "고양이를 키움", ...] 최대 20개
  user_style text,                                -- 내 말투 요약 (ㅋㅋ 습관, 말끝, 길이)
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

alter table public.affinities enable row level security;

drop policy if exists "affinities_own" on public.affinities;

-- 내 호감도만 보고 고칠 수 있음
create policy "affinities_own" on public.affinities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
