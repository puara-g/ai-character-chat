-- 캐릭터 리뷰(별점 + 한 줄 리뷰)와 캐릭터별 통계
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  content text check (content is null or char_length(content) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, user_id) -- 한 사람이 캐릭터 하나에 리뷰 하나
);

create index if not exists reviews_character_idx on public.reviews (character_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_visible" on public.reviews;
drop policy if exists "reviews_insert_own_public" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;

-- 볼 수 있는 캐릭터(공개 캐릭터나 내 캐릭터)의 리뷰만 보임
create policy "reviews_select_visible" on public.reviews
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = reviews.character_id and (c.is_public or c.user_id = auth.uid())
    )
  );

-- 남이 만든 공개 캐릭터에만, 내 이름으로
create policy "reviews_insert_own_public" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.characters c
      where c.id = reviews.character_id and c.is_public and c.user_id is distinct from auth.uid()
    )
  );

create policy "reviews_update_own" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews_delete_own" on public.reviews
  for delete using (auth.uid() = user_id);

-- 캐릭터별 리뷰 수·평균 별점 (보는 사람 권한으로 계산 → 볼 수 있는 리뷰만 집계)
create or replace view public.character_stats
with (security_invoker = true) as
select
  character_id,
  count(*)::int as review_count,
  round(avg(rating)::numeric, 2)::float as avg_rating
from public.reviews
group by character_id;

grant select on public.character_stats to anon, authenticated;
