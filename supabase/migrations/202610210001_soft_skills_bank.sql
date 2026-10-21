begin;
-- Additive migration: legacy encrypted records and Auth users are untouched.
create schema if not exists northstar_private;
revoke all on schema northstar_private from public, anon, authenticated;
create table public.northstar_question_editors (
  user_id uuid primary key references auth.users(id), created_at timestamptz not null default now()
);
create table public.northstar_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'soft-skills' check(module='soft-skills'),
  title text not null check(length(title) between 1 and 120),
  status text not null default 'draft' check(status in ('draft','published')),
  revision integer not null default 0,
  reviewer text, reviewed_at timestamptz, published_at timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.northstar_questions (
  version_id uuid not null references public.northstar_assessment_versions(id),
  item_id text not null, position integer not null,
  area text not null check(area in ('Communication','Teamwork','Problem-solving','Adaptability')),
  title text not null, scenario text not null, options jsonb not null,
  primary key(version_id,item_id), unique(version_id,position)
);
create table northstar_private.soft_scoring (
  version_id uuid not null, item_id text not null,
  points jsonb not null default '{}', rationale text not null default '',
  primary key(version_id,item_id), foreign key(version_id,item_id) references public.northstar_questions(version_id,item_id) on delete cascade
);
create table public.northstar_soft_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  version_id uuid not null references public.northstar_assessment_versions(id),
  answers jsonb not null default '{}', flags jsonb not null default '[]',
  revision integer not null default 0, submitted_at timestamptz, scores jsonb,
  updated_at timestamptz not null default now(), unique(user_id,version_id)
);
create index northstar_soft_attempts_user on public.northstar_soft_attempts(user_id,updated_at desc);
alter table public.northstar_question_editors enable row level security;
alter table public.northstar_assessment_versions enable row level security;
alter table public.northstar_questions enable row level security;
alter table public.northstar_soft_attempts enable row level security;
alter table northstar_private.soft_scoring enable row level security;
revoke all on public.northstar_question_editors,public.northstar_assessment_versions,public.northstar_questions,public.northstar_soft_attempts from public,anon,authenticated;
revoke all on northstar_private.soft_scoring from public,anon,authenticated;
grant select on public.northstar_question_editors,public.northstar_assessment_versions,public.northstar_questions,public.northstar_soft_attempts to authenticated;
create policy editor_self on public.northstar_question_editors for select to authenticated using(user_id=(select auth.uid()));
create policy visible_versions on public.northstar_assessment_versions for select to authenticated using(status='published' or exists(select 1 from public.northstar_question_editors where user_id=(select auth.uid())));
create policy visible_questions on public.northstar_questions for select to authenticated using(exists(select 1 from public.northstar_assessment_versions where id=version_id));
create policy own_attempts on public.northstar_soft_attempts for select to authenticated using(user_id=(select auth.uid()));

-- Even direct operator edits must clone a published version first.
create function northstar_private.freeze_published() returns trigger language plpgsql set search_path='' as $$
declare vid uuid;
begin
  if tg_table_name='northstar_assessment_versions' then
    if old.status='published' then raise exception 'Published versions are immutable. Create a draft copy.'; end if;
  else
    if tg_op='DELETE' then vid=old.version_id; else vid=new.version_id; end if;
    perform 1 from public.northstar_assessment_versions where id=vid for update;
    if exists(select 1 from public.northstar_assessment_versions where id=vid and status='published') then raise exception 'Published questions and scoring are immutable.'; end if;
    if tg_op='UPDATE' and old.version_id<>new.version_id then raise exception 'Question version cannot change.'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger freeze_version before update or delete on public.northstar_assessment_versions for each row execute function northstar_private.freeze_published();
create trigger freeze_questions before insert or update or delete on public.northstar_questions for each row execute function northstar_private.freeze_published();
create trigger freeze_scoring before insert or update or delete on northstar_private.soft_scoring for each row execute function northstar_private.freeze_published();

create function northstar_private.bank_document(vid uuid, include_key boolean default false) returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('version',to_jsonb(v),'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.item_id,'area',q.area,'title',q.title,'scenario',q.scenario,'options',q.options) || case when include_key then jsonb_build_object('points',s.points,'rationale',s.rationale) else '{}'::jsonb end order by q.position) from public.northstar_questions q left join northstar_private.soft_scoring s using(version_id,item_id) where q.version_id=v.id),'[]'::jsonb)) from public.northstar_assessment_versions v where v.id=vid
$$;
revoke all on function northstar_private.bank_document(uuid,boolean) from public,anon,authenticated;

create function public.northstar_bank_admin(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); vid uuid; source_id uuid; v public.northstar_assessment_versions; q jsonb; opt jsonb; pos integer=0; n integer; result jsonb;
begin
  if uid is null or not exists(select 1 from public.northstar_question_editors where user_id=uid) then raise exception using errcode='42501',message='Question editor access required.'; end if;
  if action='list' then return jsonb_build_object('versions',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc) from public.northstar_assessment_versions x),'[]'::jsonb)); end if;
  if action='create' then
    if length(trim(coalesce(payload->>'title',''))) not between 1 and 120 then raise exception 'Enter a title of 1 to 120 characters.'; end if;
    source_id=nullif(payload->>'sourceId','')::uuid;
    insert into public.northstar_assessment_versions(title,created_by) values(trim(payload->>'title'),uid) returning id into vid;
    if source_id is not null then
      if not exists(select 1 from public.northstar_assessment_versions where id=source_id) then raise exception 'Source version not found.'; end if;
      insert into public.northstar_questions select vid,item_id,position,area,title,scenario,options from public.northstar_questions where version_id=source_id;
      insert into northstar_private.soft_scoring select vid,item_id,points,rationale from northstar_private.soft_scoring where version_id=source_id;
    end if;
    return northstar_private.bank_document(vid,true);
  end if;
  vid=(payload->>'versionId')::uuid;
  select * into v from public.northstar_assessment_versions where id=vid for update;
  if not found then raise exception 'Question version not found.'; end if;
  if action='get' then return northstar_private.bank_document(vid,true); end if;
  if v.status<>'draft' then raise exception 'Create a draft copy to make changes.'; end if;
  if (payload->>'revision')::integer is distinct from v.revision then raise exception using errcode='40001',message='A newer edit exists. Reload this draft.'; end if;
  if action='save' then
    if jsonb_typeof(payload->'questions') is distinct from 'array' or jsonb_array_length(payload->'questions') not between 1 and 60 then raise exception 'Provide 1 to 60 questions.'; end if;
    if length(trim(coalesce(payload->>'title',''))) not between 1 and 120 then raise exception 'Enter a title of 1 to 120 characters.'; end if;
    delete from northstar_private.soft_scoring where version_id=vid;
    delete from public.northstar_questions where version_id=vid;
    for q in select value from jsonb_array_elements(payload->'questions') loop
      pos=pos+1;
      if coalesce(q->>'id','') !~ '^SS-[A-Za-z0-9_-]{1,40}$' then raise exception 'Use a stable SS- question ID.'; end if;
      if length(trim(coalesce(q->>'title',''))) not between 1 and 160 or length(trim(coalesce(q->>'scenario',''))) not between 1 and 4000 then raise exception 'Each question needs a title and scenario.'; end if;
      if jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>4 then raise exception 'Each question needs four options.'; end if;
      n=0;
      for opt in select value from jsonb_array_elements(q->'options') loop
        n=n+1;
        if opt->>'id' is distinct from substr('ABCD',n,1) or length(trim(coalesce(opt->>'text',''))) not between 1 and 1000 then raise exception 'Options must be A, B, C and D with nonempty text.'; end if;
      end loop;
      if jsonb_typeof(coalesce(q->'points','{}'))<>'object' then raise exception 'Invalid scoring key.'; end if;
      for opt in select to_jsonb(x) from jsonb_each(coalesce(q->'points','{}')) x loop
        if opt->>'key' not in ('A','B','C','D') or (opt->'value')::text not in ('0','1','2','3') then raise exception 'Points must be integers from 0 to 3.'; end if;
      end loop;
      if length(coalesce(q->>'rationale',''))>4000 then raise exception 'Scoring explanation is too long.'; end if;
      insert into public.northstar_questions values(vid,q->>'id',pos,q->>'area',trim(q->>'title'),trim(q->>'scenario'),q->'options');
      insert into northstar_private.soft_scoring values(vid,q->>'id',coalesce(q->'points','{}'),coalesce(q->>'rationale',''));
    end loop;
    update public.northstar_assessment_versions set title=trim(payload->>'title'),revision=revision+1,reviewer=null,reviewed_at=null where id=vid;
  elsif action='publish' then
    if payload->>'reviewConfirmed' is distinct from 'true' or length(trim(coalesce(payload->>'reviewer',''))) not between 3 and 160 then raise exception 'Record the completed faculty review before publishing.'; end if;
    if (select count(*) from public.northstar_questions where version_id=vid)<>12 or exists(select 1 from (values ('Communication'),('Teamwork'),('Problem-solving'),('Adaptability')) areas(name) where (select count(*) from public.northstar_questions q where q.version_id=vid and q.area=areas.name)<>3) then raise exception 'Publication requires 12 questions, three per skill area.'; end if;
    if exists(select 1 from public.northstar_questions q left join northstar_private.soft_scoring s using(version_id,item_id) where q.version_id=vid and (s.points is null or not(s.points ?& array['A','B','C','D']) or length(trim(s.rationale))<10)) then raise exception 'Complete the reviewed scoring key and explanation for every question.'; end if;
    update public.northstar_assessment_versions set status='published',reviewer=trim(payload->>'reviewer'),reviewed_at=now(),published_at=now(),revision=revision+1 where id=vid;
  else raise exception 'Unknown editor action.';
  end if;
  return northstar_private.bank_document(vid,true);
end $$;
revoke all on function public.northstar_bank_admin(text,jsonb) from public,anon;
grant execute on function public.northstar_bank_admin(text,jsonb) to authenticated;

create function public.northstar_soft_student(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); a public.northstar_soft_attempts; vid uuid; pair record; flags jsonb; computed_scores jsonb;
begin
  if uid is null then raise exception using errcode='42501',message='Sign in to open your assessment.'; end if;
  if action='load' then
    -- Resume an existing attempt instead of silently switching to a newer bank.
    select * into a from public.northstar_soft_attempts where user_id=uid order by updated_at desc,id limit 1;
    if not found then
      select id into vid from public.northstar_assessment_versions where status='published' order by published_at desc,id limit 1;
      if vid is null then return jsonb_build_object('available',false,'message','Soft-skills questions are awaiting review and publication.'); end if;
      insert into public.northstar_soft_attempts(user_id,version_id) values(uid,vid) on conflict(user_id,version_id) do nothing;
      select * into a from public.northstar_soft_attempts where user_id=uid and version_id=vid;
    end if;
  else
    select * into a from public.northstar_soft_attempts where id=(payload->>'attemptId')::uuid and user_id=uid for update;
    if not found then raise exception using errcode='42501',message='Assessment not found for this account.'; end if;
    if a.submitted_at is not null then raise exception 'Submitted answers are locked.'; end if;
    if (payload->>'revision')::integer is distinct from a.revision then raise exception using errcode='40001',message='Newer answers exist. Reload before editing.'; end if;
    if action='save' then
      if jsonb_typeof(payload->'answers') is distinct from 'object' or jsonb_typeof(payload->'flags') is distinct from 'array' then raise exception 'Invalid answer format.'; end if;
      for pair in select * from jsonb_each_text(payload->'answers') loop
        if pair.value is null or pair.value not in ('A','B','C','D') or not exists(select 1 from public.northstar_questions where version_id=a.version_id and item_id=pair.key) then raise exception 'Invalid question or choice.'; end if;
      end loop;
      if jsonb_array_length(payload->'flags')>12 or exists(select 1 from jsonb_array_elements_text(payload->'flags') f(id) where not exists(select 1 from public.northstar_questions q where q.version_id=a.version_id and q.item_id=f.id)) then raise exception 'Invalid review flag.'; end if;
      update public.northstar_soft_attempts set answers=payload->'answers',flags=payload->'flags',revision=revision+1,updated_at=now() where id=a.id returning * into a;
    elsif action='submit' then
      if (select count(*) from jsonb_object_keys(a.answers))<>(select count(*) from public.northstar_questions where version_id=a.version_id) then raise exception 'Answer every scenario before submitting.'; end if;
      select jsonb_object_agg(area,jsonb_build_object('points',total,'maximum',maximum)) into computed_scores from (select q.area,sum((s.points->>(a.answers->>q.item_id))::integer) total,count(*)*3 maximum from public.northstar_questions q join northstar_private.soft_scoring s using(version_id,item_id) where q.version_id=a.version_id group by q.area) results;
      update public.northstar_soft_attempts set submitted_at=now(),scores=computed_scores,revision=revision+1,updated_at=now() where id=a.id returning * into a;
    else raise exception 'Unknown student action.';
    end if;
  end if;
  return jsonb_build_object('available',true,'attempt',to_jsonb(a),'bank',northstar_private.bank_document(a.version_id,false));
end $$;
revoke all on function public.northstar_soft_student(text,jsonb) from public,anon;
grant execute on function public.northstar_soft_student(text,jsonb) to authenticated;
commit;
