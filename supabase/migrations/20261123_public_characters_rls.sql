-- 캐릭터 공개(둘러보기) 기능 + 접근 제한(RLS)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

-- 1) 컬럼 추가
alter table public.characters
  add column if not exists is_public boolean not null default false;

alter table public.chat_sessions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- 기존 대화방은 캐릭터 주인의 것으로 연결
update public.chat_sessions s
set user_id = c.user_id
from public.characters c
where s.character_id = c.id
  and s.user_id is null;

create index if not exists chat_sessions_user_character_idx
  on public.chat_sessions (user_id, character_id);

create index if not exists characters_public_idx
  on public.characters (is_public, created_at desc);

-- 2) 세 테이블의 기존 정책을 모두 지우고 새로 정의
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('characters', 'chat_sessions', 'messages')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.characters enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;

-- characters: 공개 캐릭터는 누구나 보기, 나머지는 주인만
create policy "characters_select_public_or_own" on public.characters
  for select using (is_public or auth.uid() = user_id);

create policy "characters_insert_own" on public.characters
  for insert with check (auth.uid() = user_id);

create policy "characters_update_own" on public.characters
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "characters_delete_own" on public.characters
  for delete using (auth.uid() = user_id);

-- chat_sessions: 내 대화방만
create policy "chat_sessions_own" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages: 내 대화방의 메시지만
create policy "messages_own_session" on public.messages
  for all
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  );
