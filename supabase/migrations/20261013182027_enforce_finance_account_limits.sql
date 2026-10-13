-- Enforce account limits on the stored financial document. Existing data is preserved.
create or replace function public.enforce_finance_account_limits()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare account_limit integer; new_count integer; old_count integer := 0;
begin
  if jsonb_typeof(new.data) is distinct from 'object'
     or jsonb_typeof(new.data->'accounts') is distinct from 'array'
     or jsonb_typeof(new.data->'transactions') is distinct from 'array' then
    raise exception using errcode='23514', message='INVALID_FINANCE_DOCUMENT';
  end if;
  new_count := jsonb_array_length(new.data->'accounts');
  if tg_op = 'UPDATE' and jsonb_typeof(old.data->'accounts') = 'array' then
    old_count := jsonb_array_length(old.data->'accounts');
  end if;
  select p.limit_bank_accounts into account_limit
    from public.subscriptions s join public.plans p on p.id=s.plan_id
    where s.user_id=new.user_id and s.status in ('active','trialing')
      and (s.expires_at is null or s.expires_at > now()) and p.is_active
    order by s.started_at desc limit 1;
  if not found then
    select p.limit_bank_accounts into account_limit from public.plans p where p.code='free' and p.is_active;
    if not found then raise exception 'FREE_PLAN_UNAVAILABLE'; end if;
  end if;
  -- Grandfather existing accounts; never remove accounts on downgrade.
  if account_limit is not null and new_count > greatest(account_limit,old_count) then
    raise exception using errcode='23514', message='ACCOUNT_LIMIT_EXCEEDED';
  end if;
  -- Server-controlled revisions make stale-write comparison reliable.
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.enforce_finance_account_limits() from public, anon, authenticated;
create trigger enforce_finance_account_limits
before insert or update on public.user_finance_data
for each row execute function public.enforce_finance_account_limits();
