-- 실시간 랭킹: 최근 N시간 동안 공개 캐릭터별로 "대화한 사람 수"와 "보낸 메시지 수"만 집계
-- (대화 내용·누가 했는지는 돌려주지 않음. 메시지 테이블은 RLS로 막혀 있어서 security definer 함수로 숫자만 계산)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

create index if not exists messages_created_idx on public.messages (created_at);

create or replace function public.character_ranking(window_hours int default 24, max_rows int default 50)
returns table (character_id uuid, chatters int, messages int)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.character_id,
    count(distinct s.user_id)::int as chatters,
    count(m.id)::int as messages
  from public.messages m
  join public.chat_sessions s on s.id = m.session_id
  join public.characters c on c.id = s.character_id
  where c.is_public
    and m.sender = 'user'
    and m.created_at > now() - make_interval(hours => least(greatest(window_hours, 1), 720))
  group by s.character_id
  order by chatters desc, messages desc
  limit least(greatest(max_rows, 1), 100);
$$;

revoke all on function public.character_ranking(int, int) from public;
grant execute on function public.character_ranking(int, int) to anon, authenticated;
