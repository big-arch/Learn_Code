-- Apply after the cloud and device-sync SQL. Only Learn Code functions change.
create or replace function public.learn_code_learning_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare item record; e jsonb;
begin
  if s is null then return true; end if;
  if jsonb_typeof(s)<>'object' then return false; end if;
  if (select count(*) from jsonb_each(s))>512 then return false; end if;
  for item in select * from jsonb_each(s) loop
    e:=item.value;
    if not coalesce(
      item.key ~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
      and jsonb_typeof(e)='object'
      and e->>'lesson' ~ '^(greenhouse-v1-0[1-8]|python-v2-(0[1-9]|1[0-9]|2[0-4]))$'
      and jsonb_typeof(e->'version')='number' and e->>'version' ~ '^[0-9]{1,3}$'
      and (e->>'version')::integer between 1 and 100
      and e->>'kind' in ('visit','hint','attempt') and e->>'variant' in ('lesson','review')
      and jsonb_typeof(e->'passed')='boolean' and jsonb_typeof(e->'helped')='boolean'
      and jsonb_typeof(e->'at')='string'
      and e->>'at' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
      and isfinite((e->>'at')::timestamptz),false)
    then return false; end if;
  end loop;
  return true;
exception when others then return false;
end $$;
revoke all on function public.learn_code_learning_valid(jsonb) from public,anon;
grant execute on function public.learn_code_learning_valid(jsonb) to authenticated;

-- An open tab from the previous release has no learning field.
-- Preserve new chapter data when that tab saves older course progress.
-- Explicit resets bypass this function.
create or replace function public.learn_code_preserve_learning(saved jsonb,incoming jsonb) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select case when incoming ? 'learning' then incoming else incoming || jsonb_build_object(
    'learning',coalesce(saved->'learning','{}'::jsonb),
    'completed',coalesce((select jsonb_agg(v) from (
      select value v from jsonb_array_elements(incoming->'completed')
      union select value from jsonb_array_elements(saved->'completed') where value#>>'{}' like 'greenhouse-v1-%'
    ) x),'[]'::jsonb),
    'completedAt',coalesce((select jsonb_object_agg(key,value) from jsonb_each(saved->'completedAt') where key like 'greenhouse-v1-%'),'{}'::jsonb)||(incoming->'completedAt'),
    'drafts',coalesce((select jsonb_object_agg(key,value) from jsonb_each(saved->'drafts') where key like 'greenhouse-v1-%'),'{}'::jsonb)||(incoming->'drafts')
  ) end
$$;
revoke all on function public.learn_code_preserve_learning(jsonb,jsonb) from public,anon;
grant execute on function public.learn_code_preserve_learning(jsonb,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.learn_code_state_valid(s jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_typeof(s)='object' and s->>'version'='1'
    and octet_length(s::text)<1500000
    and public.learn_code_learning_valid(s->'learning')
    and jsonb_typeof(s->'completed')='array' and jsonb_array_length(s->'completed')<=300
    and jsonb_typeof(s->'completedAt')='object' and jsonb_typeof(s->'drafts')='object'
    and jsonb_typeof(s->'sound')='boolean' and jsonb_typeof(s->'motion')='boolean'
    and not exists(select 1 from jsonb_array_elements(s->'completed') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>100)
    and not exists(select 1 from jsonb_each(s->'drafts') d where jsonb_typeof(d.value)<>'string' or length(d.key)>100 or length(d.value#>>'{}')>20000)
    and not exists(select 1 from jsonb_each(s->'completedAt') d where jsonb_typeof(d.value)<>'string' or length(d.key)>100 or length(d.value#>>'{}')>40),false)
$function$
;
CREATE OR REPLACE FUNCTION public.learn_code_sync(p_revision bigint DEFAULT NULL::bigint, p_state jsonb DEFAULT NULL::jsonb, p_reset boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    update public.learn_code_progress set state=case when p_reset then empty_state else public.learn_code_preserve_learning(saved.state,p_state) end,
      revision=revision+1, epoch=epoch+case when p_reset then 1 else 0 end, updated_at=now()
      where user_id=uid returning * into saved;
  end if;
  return jsonb_build_object('state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',true);
end $function$
;
CREATE OR REPLACE FUNCTION learn_code_private.device_sync(p_code text, p_revision bigint, p_state jsonb, p_reset boolean, p_create boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    update learn_code_private.device_progress set state=case when p_reset then empty_state else public.learn_code_preserve_learning(saved.state,p_state) end,
      revision=revision+1,epoch=epoch+case when p_reset then 1 else 0 end,updated_at=now()
      where id=saved.id returning * into saved;
  end if;
  return jsonb_build_object('id',saved.id,'state',saved.state,'revision',saved.revision,'epoch',saved.epoch,'accepted',true);
end $function$
;

