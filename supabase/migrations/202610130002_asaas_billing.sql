BEGIN;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT UNIQUE;
CREATE TABLE IF NOT EXISTS public.asaas_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;
-- Customers are managed by service role only.
CREATE INDEX IF NOT EXISTS subscriptions_asaas_subscription_idx ON public.subscriptions(asaas_subscription_id);
COMMIT;
