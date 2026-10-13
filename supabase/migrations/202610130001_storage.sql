begin;
create table if not exists public.northstar_records (
  record_key text primary key check (record_key ~ '^[a-f0-9]{64}$'),
  envelope jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.northstar_leases (
  id text primary key,
  token uuid not null,
  expires_at timestamptz not null
);
alter table public.northstar_records enable row level security;
alter table public.northstar_leases enable row level security;
revoke all on public.northstar_records, public.northstar_leases from public, anon, authenticated;
grant select, insert, update, delete on public.northstar_records, public.northstar_leases to service_role;

create or replace function public.northstar_acquire(p_token uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare acquired uuid;
begin
  insert into northstar_leases as lease (id, token, expires_at)
  values ('records', p_token, clock_timestamp() + interval '120 seconds')
  on conflict (id) do update set token = excluded.token, expires_at = excluded.expires_at
  where lease.expires_at < clock_timestamp() or lease.token = p_token
  returning token into acquired;
  return acquired is not null;
end;
$$;
create or replace function public.northstar_release(p_token uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  delete from northstar_leases where id = 'records' and token = p_token;
  return found;
end;
$$;
create or replace function public.northstar_write(p_key text, p_envelope jsonb, p_token uuid default null) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if p_token is not null then
    perform 1 from northstar_leases where id = 'records' and token = p_token
      and expires_at > clock_timestamp() for update;
    if not found then raise exception 'Storage lease expired'; end if;
  end if;
  insert into northstar_records (record_key, envelope) values (p_key, p_envelope)
  on conflict (record_key) do update set envelope = excluded.envelope, updated_at = now();
  return true;
end;
$$;
revoke execute on function public.northstar_acquire(uuid), public.northstar_release(uuid), public.northstar_write(text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.northstar_acquire(uuid), public.northstar_release(uuid), public.northstar_write(text,jsonb,uuid) to service_role;
commit;
