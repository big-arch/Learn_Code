-- Isolated Learn Code storage. No existing application tables are modified.
create function public.learn_code_state_valid(s jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(s)='object' and s->>'version'='1'
    and octet_length(s::text)<1500000
    and jsonb_typeof(s->'completed')='array' and jsonb_array_length(s->'completed')<=300
    and jsonb_typeof(s->'completedAt')='object' and jsonb_typeof(s->'drafts')='object'
    and jsonb_typeof(s->'sound')='boolean' and jsonb_typeof(s->'motion')='boolean'
    and not exists(select 1 from jsonb_array_elements(s->'completed') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>100)
    and not exists(select 1 from jsonb_each(s->'drafts') d where jsonb_typeof(d.value)<>'string' or length(d.key)>100 or length(d.value#>>'{}')>20000)
    and not exists(select 1 from jsonb_each(s->'completedAt') d where jsonb_typeof(d.value)<>'string' or length(d.key)>100 or length(d.value#>>'{}')>40),false)
$$;
revoke all on function public.learn_code_state_valid(jsonb) from public, anon;
grant execute on function public.learn_code_state_valid(jsonb) to authenticated;
create table public.learn_code_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check(public.learn_code_state_valid(state)),
  revision bigint not null default 0 check(revision>=0),
  epoch bigint not null default 0 check(epoch>=0),
  updated_at timestamptz not null default now()
);
alter table public.learn_code_progress enable row level security;
revoke all on public.learn_code_progress from anon;
grant select,insert,update on public.learn_code_progress to authenticated;
create policy learn_code_read_own on public.learn_code_progress for select to authenticated using((select auth.uid())=user_id);
create policy learn_code_insert_own on public.learn_code_progress for insert to authenticated with check((select auth.uid())=user_id);
create policy learn_code_update_own on public.learn_code_progress for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create function public.learn_code_sync(p_revision bigint default null,p_state jsonb default null,p_reset boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  saved public.learn_code_progress%rowtype;
  empty_state jsonb := '{"version":1,"xp":0,"completed":[],"completedAt":{},"drafts":{},"activity":[0,0,0,0,0,0,0],"streak":0,"lastCompletionDate":null,"sound":true,"motion":true}'::jsonb;
begin
  if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
  insert into public.learn_code_progress(user_id,state) values(uid,empty_state) on conflict(user_id) do nothing;
  select * into saved from public.learn_code_progress where user_id=uid for update;
  if p_state is not null then
    if p_revision is null or p_revision<>saved.revision then
      return jsonb_build_object('state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',false);
    end if;
    if not public.learn_code_state_valid(p_state) then raise exception 'Invalid progress' using errcode='22023'; end if;
    update public.learn_code_progress set state=case when p_reset then empty_state else p_state end,
      revision=revision+1, epoch=epoch+case when p_reset then 1 else 0 end, updated_at=now()
      where user_id=uid returning * into saved;
  end if;
  return jsonb_build_object('state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',true);
end $$;
revoke all on function public.learn_code_sync(bigint,jsonb,boolean) from public,anon;
grant execute on function public.learn_code_sync(bigint,jsonb,boolean) to authenticated;
