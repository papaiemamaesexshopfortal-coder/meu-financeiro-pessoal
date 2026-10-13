-- Billing, plans, feature flags and custom categories for Supabase
BEGIN;

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('free','premium','mei_pme_pro')),
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_monthly >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  limit_bank_accounts INTEGER CHECK (limit_bank_accounts IS NULL OR limit_bank_accounts >= 0),
  limit_issuances INTEGER CHECK (limit_issuances IS NULL OR limit_issuances >= 0),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','canceled','past_due','incomplete','trialing')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON public.subscriptions(user_id,status);
CREATE INDEX IF NOT EXISTS subscriptions_expiration_idx
  ON public.subscriptions(expires_at) WHERE status IN ('active','trialing');

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_current_per_user
  ON public.subscriptions(user_id)
  WHERE status IN ('active','trialing','incomplete');

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  emoji TEXT NOT NULL DEFAULT '🧾',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id,type,name)
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_active" ON public.plans;
CREATE POLICY "plans_read_active" ON public.plans FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "users_read_own_subscription" ON public.subscriptions;
CREATE POLICY "users_read_own_subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_manage_own_categories" ON public.user_categories;
CREATE POLICY "users_manage_own_categories" ON public.user_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service-role-only billing_events: no client policies by design.

INSERT INTO public.plans(code,name,price_monthly,limit_bank_accounts,limit_issuances,features)
VALUES
('free','Gratuito',0,1,0,'{"manual_transactions":true,"basic_charts":true,"bank_sync":false,"ai_categorization":false,"advanced_reports":false,"invoice_issuance":false,"boleto_pix":false,"corporate_dre":false}'::jsonb),
('premium','Premium',19.90,5,0,'{"manual_transactions":true,"basic_charts":true,"bank_sync":true,"ai_categorization":true,"advanced_reports":true,"invoice_issuance":false,"boleto_pix":false,"corporate_dre":false}'::jsonb),
('mei_pme_pro','MEI/PME Pro',199,10,500,'{"manual_transactions":true,"basic_charts":true,"bank_sync":true,"ai_categorization":true,"advanced_reports":true,"invoice_issuance":true,"boleto_pix":true,"corporate_dre":true}'::jsonb)
ON CONFLICT(code) DO NOTHING;

COMMIT;
