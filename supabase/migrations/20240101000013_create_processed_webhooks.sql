-- Processed webhooks — idempotency table for PayPal and other webhook sources
CREATE TABLE public.processed_webhooks (
  event_id     text        PRIMARY KEY,
  source       text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
