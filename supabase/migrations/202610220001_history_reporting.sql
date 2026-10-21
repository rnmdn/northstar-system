begin;

-- Only the authenticated editor RPC can create history entries. Snapshots include
-- private rubrics and therefore stay in the private schema.
create table northstar_private.question_history (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.northstar_assessment_versions(id),
  actor_id uuid not null references auth.users(id),
  action text not null check(action in ('create','save','publish')),
  occurred_at timestamptz not null default now(),
  before_document jsonb, after_document jsonb not null
);
create index question_history_version_time on northstar_private.question_history(version_id,occurred_at desc,id);
alter table northstar_private.question_history enable row level security;
revoke all on northstar_private.question_history from public,anon,authenticated,service_role;
create function northstar_private.reject_history_change() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Question history is append-only.'; end $$;
create trigger keep_question_history before update or delete on northstar_private.question_history
for each row execute function northstar_private.reject_history_change();

alter function public.northstar_bank_admin(text,jsonb) set schema northstar_private;
alter function northstar_private.northstar_bank_admin(text,jsonb) rename to bank_admin_v1;
revoke all on function northstar_private.bank_admin_v1(text,jsonb) from public,anon,authenticated;

create function public.northstar_bank_admin(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); vid uuid; previous jsonb; result jsonb;
begin
  if uid is null or not exists(select 1 from public.northstar_question_editors where user_id=uid) then
    raise exception using errcode='42501',message='Question editor access required.';
  end if;
  if action='history' then
    vid=(payload->>'versionId')::uuid;
    return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(events) order by occurred_at desc,id) from (
      select h.id,h.actor_id,h.action,h.occurred_at,
        (h.after_document->'version'->>'revision')::integer as revision,
        h.before_document->'version'->>'title' as before_title,
        h.after_document->'version'->>'title' as after_title,
        coalesce((select jsonb_agg(jsonb_build_object('id',coalesce(b.q->>'id',a.q->>'id'),
          'before',b.q,'after',a.q) order by coalesce(b.q->>'id',a.q->>'id'))
          from jsonb_array_elements(coalesce(h.before_document->'questions','[]')) b(q)
          full join jsonb_array_elements(h.after_document->'questions') a(q) on b.q->>'id'=a.q->>'id'
          where b.q is distinct from a.q),'[]') as changes
      from northstar_private.question_history h where h.version_id=vid
      order by h.occurred_at desc,h.id limit 50
    ) events),'[]'));
  end if;
  if action in ('save','publish') then
    vid=(payload->>'versionId')::uuid;
    perform 1 from public.northstar_assessment_versions where id=vid for update;
    previous=northstar_private.bank_document(vid,true);
  end if;
  result=northstar_private.bank_admin_v1(action,payload);
  if action in ('create','save','publish') then
    insert into northstar_private.question_history(version_id,actor_id,action,before_document,after_document)
    values((result->'version'->>'id')::uuid,uid,action,previous,result);
  end if;
  return result;
end $$;
revoke all on function public.northstar_bank_admin(text,jsonb) from public,anon;
grant execute on function public.northstar_bank_admin(text,jsonb) to authenticated;

-- A reporting projection, never the source of assessment answers or grades.
-- Raw written/code responses remain in the encrypted record store.
create table public.northstar_technical_attempts (
  record_id uuid not null,
  bank_version text not null check(bank_version in ('3.0','4.0')),
  user_id uuid not null references auth.users(id),
  source_revision integer not null check(source_revision>=0),
  state_fingerprint text not null check(state_fingerprint ~ '^[a-f0-9]{64}$'),
  submitted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key(record_id,bank_version)
);
create index technical_attempts_user on public.northstar_technical_attempts(user_id,synced_at desc);
create table public.northstar_technical_items (
  record_id uuid not null, bank_version text not null,
  item_id text not null, career text not null, component text not null check(component in ('knowledge','practical','written')),
  response_status text not null check(response_status in ('unanswered','answered','not_learned','skipped')),
  grading_status text not null check(grading_status in ('unanswered','pending','graded','grading_error')),
  points integer, maximum integer not null check(maximum between 1 and 4),
  primary key(record_id,bank_version,item_id),
  foreign key(record_id,bank_version) references public.northstar_technical_attempts(record_id,bank_version),
  check((grading_status='graded' and points is not null and points between 0 and maximum) or (grading_status<>'graded' and points is null))
);
alter table public.northstar_technical_attempts enable row level security;
alter table public.northstar_technical_items enable row level security;
revoke all on public.northstar_technical_attempts,public.northstar_technical_items from public,anon,authenticated;
grant select on public.northstar_technical_attempts,public.northstar_technical_items to authenticated;
create policy own_technical_attempt on public.northstar_technical_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy own_technical_items on public.northstar_technical_items for select to authenticated using(exists(
  select 1 from public.northstar_technical_attempts a where a.record_id=northstar_technical_items.record_id and a.bank_version=northstar_technical_items.bank_version));

create function public.northstar_sync_technical(payload jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare r uuid=(payload->>'recordId')::uuid; b text=payload->>'bankVersion'; old_row public.northstar_technical_attempts; item jsonb;
begin
  -- Only the trusted server service role receives EXECUTE on this function.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r::text||':'||b,0));
  select * into old_row from public.northstar_technical_attempts where record_id=r and bank_version=b for update;
  if found then
    if old_row.user_id is distinct from (payload->>'userId')::uuid then raise exception 'Reporting owner mismatch.'; end if;
    if old_row.source_revision>(payload->>'sourceRevision')::integer then return false; end if;
  end if;
  if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items')<>48
    or (select count(distinct x->>'id') from jsonb_array_elements(payload->'items') x)<>48 then raise exception 'Reporting requires 48 technical items.'; end if;
  insert into public.northstar_technical_attempts(record_id,bank_version,user_id,source_revision,state_fingerprint,submitted_at)
  values(r,b,(payload->>'userId')::uuid,(payload->>'sourceRevision')::integer,payload->>'stateFingerprint',nullif(payload->>'submittedAt','')::timestamptz)
  on conflict(record_id,bank_version) do update set source_revision=excluded.source_revision,state_fingerprint=excluded.state_fingerprint,submitted_at=excluded.submitted_at,synced_at=now();
  for item in select value from jsonb_array_elements(payload->'items') loop
    insert into public.northstar_technical_items as current_item values(r,b,item->>'id',item->>'career',item->>'component',item->>'responseStatus',item->>'gradingStatus',(item->>'points')::integer,(item->>'maximum')::integer)
    on conflict(record_id,bank_version,item_id) do update set career=excluded.career,component=excluded.component,response_status=excluded.response_status,maximum=excluded.maximum,
      grading_status=case when old_row.source_revision=(payload->>'sourceRevision')::integer and current_item.grading_status='graded' and excluded.grading_status<>'graded' then current_item.grading_status else excluded.grading_status end,
      points=case when old_row.source_revision=(payload->>'sourceRevision')::integer and current_item.grading_status='graded' and excluded.grading_status<>'graded' then current_item.points else excluded.points end;
  end loop;
  return true;
end $$;
revoke all on function public.northstar_sync_technical(jsonb) from public,anon,authenticated;
grant execute on function public.northstar_sync_technical(jsonb) to service_role;

-- These views obey the SELECT permissions/RLS of the caller. Database operators
-- can inspect all rows; regular students can query only their own projection.
create view public.northstar_technical_report with (security_invoker=true) as
select a.user_id,a.record_id,a.bank_version,a.source_revision,a.submitted_at,a.synced_at,
  count(*)::integer total_items,
  count(*) filter(where i.response_status in ('answered','not_learned'))::integer answered_items,
  count(*) filter(where i.response_status='not_learned')::integer not_learned_items,
  count(*) filter(where i.response_status='skipped')::integer skipped_items,
  count(*) filter(where i.grading_status='graded')::integer graded_items,
  count(*) filter(where i.grading_status in ('pending','grading_error'))::integer pending_items
from public.northstar_technical_attempts a join public.northstar_technical_items i using(record_id,bank_version)
group by a.user_id,a.record_id,a.bank_version,a.source_revision,a.submitted_at,a.synced_at;
create view public.northstar_technical_area_report with (security_invoker=true) as
select a.user_id,a.record_id,a.bank_version,i.career,i.component,
 count(*)::integer total_items,count(*) filter(where i.grading_status='graded')::integer graded_items,
 case when bool_and(i.grading_status='graded') then sum(i.points)::integer else null end points,
 sum(i.maximum)::integer maximum
from public.northstar_technical_attempts a join public.northstar_technical_items i using(record_id,bank_version)
group by a.user_id,a.record_id,a.bank_version,i.career,i.component;
revoke all on public.northstar_technical_report,public.northstar_technical_area_report from public,anon,authenticated;
grant select on public.northstar_technical_report,public.northstar_technical_area_report to authenticated;
grant select on public.northstar_technical_attempts,public.northstar_technical_items,public.northstar_technical_report,public.northstar_technical_area_report to service_role;
commit;
