-- Additive, service-only billing operations. No existing financial documents are modified.
alter table public.subscriptions
 add column if not exists billing_environment text,
 add column if not exists billing_amount numeric(10,2),
 add column if not exists checkout_key uuid unique,
 add column if not exists checkout_hash text,
 add column if not exists checkout_state text not null default 'legacy',
 add column if not exists checkout_due_date date,
 add column if not exists billing_lock_token uuid,
 add column if not exists billing_lock_until timestamptz;

create table public.billing_customer_links (
 user_id uuid not null references auth.users(id),
 environment text not null check(environment='sandbox'),
 provider_customer_id text not null,
 primary key(user_id,environment), unique(environment,provider_customer_id)
);
alter table public.billing_customer_links enable row level security;
revoke all on public.billing_customer_links from anon, authenticated;
grant select,insert,update on public.billing_customer_links to service_role;

create table public.billing_inbox (
 provider_event_id text primary key check(length(provider_event_id) between 1 and 200),
 event_type text not null,
 provider_subscription_id text not null,
 state text not null default 'pending' check(state in ('pending','done')),
 received_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.billing_inbox enable row level security;
revoke all on public.billing_inbox from anon, authenticated;
grant select,insert,update on public.billing_inbox to service_role;

create function public.claim_checkout(p_user uuid,p_plan uuid,p_hash text,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; amount numeric; pcode text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select price_monthly,code into amount,pcode from public.plans where id=p_plan and is_active;
 if not found or pcode not in ('premium','mei_pme_pro') or amount<=0 then raise exception 'INVALID_PLAN'; end if;
 -- Explicit paid checkout supersedes an optional free subscription, without deleting it.
 update public.subscriptions set status='canceled',canceled_at=now()
 where user_id=p_user and asaas_subscription_id is null and status in ('active','trialing')
 and plan_id in (select id from public.plans where code='free');
 select * into s from public.subscriptions where user_id=p_user
 and status in ('active','trialing','incomplete','past_due') order by started_at desc limit 1 for update;
 if found then
  if s.checkout_key is null or s.billing_environment is distinct from 'sandbox' then return jsonb_build_object('error','EXISTING_SUBSCRIPTION_REQUIRES_REVIEW'); end if;
  if s.status in ('active','trialing') then return jsonb_build_object('error','SUBSCRIPTION_EXISTS'); end if;
  if s.plan_id<>p_plan or s.checkout_hash<>p_hash then return jsonb_build_object('error','CHECKOUT_DETAILS_CHANGED'); end if;
 else
  insert into public.subscriptions(user_id,plan_id,status,billing_environment,billing_amount,checkout_key,checkout_hash,checkout_state,checkout_due_date)
  values(p_user,p_plan,'incomplete','sandbox',amount,gen_random_uuid(),p_hash,'reserved',(now() at time zone 'America/Fortaleza')::date)
  returning * into s;
 end if;
 if s.billing_lock_until>now() then return jsonb_build_object('error','BILLING_BUSY'); end if;
 update public.subscriptions set billing_lock_token=p_token,billing_lock_until=now()+interval '2 minutes',updated_at=now() where id=s.id returning * into s;
 return jsonb_build_object('subscription',to_jsonb(s));
end$$;
revoke all on function public.claim_checkout(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_checkout(uuid,uuid,text,uuid) to service_role;

create function public.claim_billing_event(p_event text,p_type text,p_subscription text,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.billing_inbox; s public.subscriptions;
begin
 insert into public.billing_inbox(provider_event_id,event_type,provider_subscription_id)
 values(p_event,p_type,p_subscription) on conflict(provider_event_id) do nothing;
 select * into e from public.billing_inbox where provider_event_id=p_event for update;
 if e.event_type<>p_type or e.provider_subscription_id<>p_subscription then raise exception 'EVENT_ID_COLLISION'; end if;
 if e.state='done' then return jsonb_build_object('duplicate',true); end if;
 select * into s from public.subscriptions where asaas_subscription_id=p_subscription and billing_environment='sandbox' for update;
 if not found then return jsonb_build_object('error','SUBSCRIPTION_NOT_READY'); end if;
 if s.billing_lock_until>now() then return jsonb_build_object('error','BILLING_BUSY'); end if;
 update public.subscriptions set billing_lock_token=p_token,billing_lock_until=now()+interval '2 minutes' where id=s.id returning * into s;
 return jsonb_build_object('subscription',to_jsonb(s));
end$$;
revoke all on function public.claim_billing_event(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_billing_event(text,text,text,uuid) to service_role;

create function public.finish_billing_event(p_event text,p_subscription uuid,p_token uuid,p_status text,p_expires timestamptz,p_canceled boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; e public.billing_inbox;
begin
 select * into e from public.billing_inbox where provider_event_id=p_event for update;
 if not found then raise exception 'EVENT_NOT_RESERVED'; end if;
 if e.state='done' then return jsonb_build_object('duplicate',true); end if;
 select * into s from public.subscriptions where id=p_subscription and billing_lock_token=p_token for update;
 if not found or s.asaas_subscription_id<>e.provider_subscription_id then raise exception 'BILLING_LEASE_LOST'; end if;
 if p_status not in ('active','incomplete','past_due','canceled') then raise exception 'INVALID_BILLING_STATUS'; end if;
 if p_status='active' and (p_expires is null or p_expires<=now()) then raise exception 'INVALID_ACCESS_PERIOD'; end if;
 update public.subscriptions set status=p_status,expires_at=p_expires,
 canceled_at=case when p_canceled then coalesce(canceled_at,now()) else canceled_at end,
 billing_lock_token=null,billing_lock_until=null,updated_at=now() where id=s.id;
 update public.billing_inbox set state='done',processed_at=now() where provider_event_id=p_event;
 insert into public.billing_events(provider_event_id,event_type) values(p_event,e.event_type) on conflict(provider_event_id) do nothing;
 return jsonb_build_object('processed',true);
end$$;
revoke all on function public.finish_billing_event(text,uuid,uuid,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.finish_billing_event(text,uuid,uuid,text,timestamptz,boolean) to service_role;

create function public.claim_billing_cancellation(p_user uuid,p_subscription uuid,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions;
begin
 select * into s from public.subscriptions where id=p_subscription and user_id=p_user and billing_environment='sandbox' for update;
 if not found then return jsonb_build_object('error','SUBSCRIPTION_NOT_FOUND'); end if;
 if s.billing_lock_until>now() then return jsonb_build_object('error','BILLING_BUSY'); end if;
 update public.subscriptions set billing_lock_token=p_token,billing_lock_until=now()+interval '2 minutes' where id=s.id returning * into s;
 return jsonb_build_object('subscription',to_jsonb(s));
end$$;
revoke all on function public.claim_billing_cancellation(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_billing_cancellation(uuid,uuid,uuid) to service_role;

create function public.finish_billing_cancellation(p_subscription uuid,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions;
begin
 select * into s from public.subscriptions where id=p_subscription and billing_lock_token=p_token for update;
 if not found then raise exception 'BILLING_LEASE_LOST'; end if;
 update public.subscriptions set canceled_at=coalesce(canceled_at,now()),
 status=case when status='active' and expires_at>now() then 'active' else 'canceled' end,
 billing_lock_token=null,billing_lock_until=null,updated_at=now() where id=s.id returning * into s;
 return jsonb_build_object('status',s.status,'expires_at',s.expires_at,'canceled_at',s.canceled_at);
end$$;
revoke all on function public.finish_billing_cancellation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.finish_billing_cancellation(uuid,uuid) to service_role;
