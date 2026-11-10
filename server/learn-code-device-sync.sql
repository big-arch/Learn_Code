-- Capability-based access for Learn Code only. Email Auth remains unchanged.
-- A 160-bit random code authorizes exactly one profile; only its SHA-256 is stored.
create schema if not exists learn_code_private;
revoke all on schema learn_code_private from public, anon, authenticated;
grant usage on schema learn_code_private to anon, authenticated;

create table learn_code_private.device_progress (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  state jsonb not null check(public.learn_code_state_valid(state)),
  revision bigint not null default 0 check(revision>=0),
  epoch bigint not null default 0 check(epoch>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learn_code_device_created on learn_code_private.device_progress(created_at);
alter table learn_code_private.device_progress enable row level security;
revoke all on learn_code_private.device_progress from public, anon, authenticated;

-- Deliberate capability authorization: auth.uid() is not required for this mode.
-- SECURITY DEFINER stays in a non-exposed schema. No direct table access exists.
create function learn_code_private.device_sync(p_code text, p_revision bigint, p_state jsonb, p_reset boolean, p_create boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized text := upper(regexp_replace(p_code,'[[:space:]-]','','g'));
  hashed bytea;
  saved learn_code_private.device_progress%rowtype;
  empty_state jsonb := '{"version":1,"xp":0,"completed":[],"completedAt":{},"drafts":{},"activity":[0,0,0,0,0,0,0],"streak":0,"lastCompletionDate":null,"sound":true,"motion":true}'::jsonb;
begin
  if p_code is null or length(p_code)>100 or normalized !~ '^LC[A-F0-9]{40}$' then
    raise exception 'Invalid device code' using errcode='22023';
  end if;
  hashed := extensions.digest(normalized,'sha256');
  if p_create then
    if p_state is null or not public.learn_code_state_valid(p_state) or p_reset or p_revision is not null then
      raise exception 'Invalid initial progress' using errcode='22023';
    end if;
    -- Serialize creation, including retries after a lost HTTP response.
    perform pg_advisory_xact_lock(176923,1);
    if not exists(select 1 from learn_code_private.device_progress where code_hash=hashed) then
      if (select count(*) from learn_code_private.device_progress where created_at>now()-interval '1 day')>=500 then
        raise exception 'Profile creation temporarily limited' using errcode='54000';
      end if;
      insert into learn_code_private.device_progress(code_hash,state) values(hashed,p_state);
    end if;
  end if;
  select * into saved from learn_code_private.device_progress where code_hash=hashed for update;
  if not found then raise exception 'Device code not found' using errcode='P0002'; end if;
  if p_state is not null and not p_create then
    if p_revision is null or p_revision<>saved.revision then
      return jsonb_build_object('id',saved.id,'state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',false);
    end if;
    if not public.learn_code_state_valid(p_state) then raise exception 'Invalid progress' using errcode='22023'; end if;
    update learn_code_private.device_progress set state=case when p_reset then empty_state else p_state end,
      revision=revision+1,epoch=epoch+case when p_reset then 1 else 0 end,updated_at=now()
      where id=saved.id returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',true);
end $$;
revoke all on function learn_code_private.device_sync(text,bigint,jsonb,boolean,boolean) from public, anon, authenticated;
grant execute on function learn_code_private.device_sync(text,bigint,jsonb,boolean,boolean) to anon, authenticated;

create function public.learn_code_device_sync(p_code text,p_revision bigint default null,p_state jsonb default null,p_reset boolean default false,p_create boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$
  select learn_code_private.device_sync(p_code,p_revision,p_state,coalesce(p_reset,false),coalesce(p_create,false))
$$;
revoke all on function public.learn_code_device_sync(text,bigint,jsonb,boolean,boolean) from public, anon, authenticated;
grant execute on function public.learn_code_device_sync(text,bigint,jsonb,boolean,boolean) to anon, authenticated;
