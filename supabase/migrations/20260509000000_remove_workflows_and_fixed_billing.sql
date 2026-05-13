-- StormeAI is now a chat-only agent without n8n/React Flow workflow management.
-- Keep billing manual/fixed at ₱10,000/month with unlimited chats.

drop table if exists public.workflow_events cascade;
drop table if exists public.workflows cascade;
drop type if exists public.workflow_event_type cascade;

update public.billing_subscriptions
set
  billing_provider = 'manual',
  plan = 'fixed_monthly',
  limits = jsonb_build_object(
    'monthly_price_php', 10000,
    'monthly_chats', 'unlimited',
    'knowledge_documents', 'unlimited',
    'staff_users', 'unlimited'
  ),
  paddle_customer_id = null,
  paddle_subscription_id = null,
  paddle_product_id = null,
  paddle_price_id = null,
  updated_at = now();
