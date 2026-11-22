-- 사용자 닉네임 (캐릭터 제작자 표시·검색용)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(nickname) between 2 and 12),
  constraint profiles_nickname_chars check (nickname ~ '^[0-9A-Za-z가-힣_]+$')
);

-- 대소문자만 다른 닉네임도 중복으로 봄
create unique index if not exists profiles_nickname_unique on public.profiles (lower(nickname));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- 닉네임은 공개 정보 (제작자 표시)
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
