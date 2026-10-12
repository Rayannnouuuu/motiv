-- Notifications push : abonnements des appareils, réglages privés du serveur, planification.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy own_rows on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Réglages du serveur (clé privée VAPID, secret du cron) : RLS sans politique,
-- donc invisibles pour l'appli ; seuls le rôle service et postgres y accèdent.
create table public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Les valeurs de app_secrets (vapid_public, vapid_private, cron_secret) sont insérées hors dépôt.
