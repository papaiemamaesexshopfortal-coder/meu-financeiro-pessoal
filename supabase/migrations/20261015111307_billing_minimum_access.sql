-- Internal billing records are server-only. RLS with no policies already denies
-- rows, and explicit ACL revocation also prevents future policy mistakes from
-- exposing customer/payment metadata through the Data API.
revoke all privileges on table
 public.asaas_customers,
 public.billing_customer_links,
 public.billing_events,
 public.billing_inbox
from anon, authenticated;

-- Evaluate auth.uid() once per statement, retaining the same owner boundary.
drop policy if exists users_read_own_subscription on public.subscriptions;
create policy users_read_own_subscription
 on public.subscriptions for select to authenticated
 using ((select auth.uid()) = user_id);

drop policy if exists users_manage_own_categories on public.user_categories;
create policy users_manage_own_categories
 on public.user_categories for all to authenticated
 using ((select auth.uid()) = user_id)
 with check ((select auth.uid()) = user_id);

create index if not exists subscriptions_plan_id_idx
 on public.subscriptions(plan_id);
