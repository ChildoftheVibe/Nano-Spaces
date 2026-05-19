-- Invoices — PayPal billing records per organization
CREATE TABLE public.invoices (
  id                    uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  paypal_transaction_id text,
  amount_usd            numeric(10, 2) NOT NULL,
  tier                  text           NOT NULL,
  billing_period_start  timestamptz    NOT NULL,
  billing_period_end    timestamptz    NOT NULL,
  status                text           NOT NULL DEFAULT 'paid',
  pdf_url               text,
  created_at            timestamptz    NOT NULL DEFAULT now()
);
