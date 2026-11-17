begin;
do $qa$
declare code text:='LC'||upper(encode(extensions.gen_random_bytes(20),'hex'));
  event_id text:=gen_random_uuid()::text;
  base jsonb:='{"version":1,"xp":0,"completed":[],"completedAt":{},"drafts":{},"activity":[0,0,0,0,0,0,0],"streak":0,"lastCompletionDate":null,"sound":true,"motion":true}'::jsonb;
  s jsonb; r jsonb; old jsonb;
begin
  s:=base||jsonb_build_object('completed',jsonb_build_array('greenhouse-v1-01'),'completedAt',jsonb_build_object('greenhouse-v1-01','2026-11-17T10:00:00.000Z'),'drafts',jsonb_build_object('greenhouse-v1-01-review','water = moisture < 45'),'learning',jsonb_build_object(event_id,jsonb_build_object('lesson','greenhouse-v1-01','version',1,'kind','attempt','variant','review','passed',true,'helped',false,'at','2026-11-17T10:00:00.000Z')));
  if not public.learn_code_state_valid(base) or not public.learn_code_state_valid(s) then raise exception 'Valid profiles rejected';end if;
  if public.learn_code_state_valid(base||'{"learning":[]}'::jsonb) or public.learn_code_state_valid(base||'{"learning":{"bad":{}}}'::jsonb) then raise exception 'Invalid evidence accepted';end if;
  execute 'set local role anon';
  r:=public.learn_code_device_sync(code,null,s,false,true);
  if r->'state'<>s then raise exception 'Creation lost data';end if;
  r:=public.learn_code_device_sync(code);
  if r->'state'->'learning'<>s->'learning' then raise exception 'Read lost evidence';end if;
  r:=public.learn_code_device_sync(code,0,base,false,false);
  if not (r->>'accepted')::boolean or r->'state'->'learning'<>s->'learning'
    or r->'state'->'completed'<>s->'completed'
    or r->'state'->'drafts'<>s->'drafts'
    or r->'state'->'completedAt'<>s->'completedAt' then raise exception 'Older client erased chapter data: %',r;end if;
  r:=public.learn_code_device_sync(code,0,s,false,false);
  if (r->>'accepted')::boolean then raise exception 'Stale revision accepted';end if;
  r:=public.learn_code_device_sync(code,1,base,true,false);
  if r->'state' ? 'learning' or r->>'epoch'<>'1' or r->'state'->'completed'<>'[]'::jsonb then raise exception 'Reset retained evidence';end if;
  execute 'reset role';
end $qa$;
select 'PASS: validation, anonymous RPC roundtrip, old-client preservation, CAS, reset; all data rolled back' as result,
  not has_table_privilege('anon','learn_code_private.device_progress','SELECT') as private_rows_inaccessible,
  not has_function_privilege('anon','public.learn_code_sync(bigint,jsonb,boolean)','EXECUTE') as email_rpc_requires_auth;
rollback;
