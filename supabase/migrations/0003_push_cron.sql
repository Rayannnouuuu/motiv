-- Appelle la fonction « notify » toutes les 15 min ; elle décide quels rappels envoyer (heures tirées au hasard chaque jour).
-- Le secret est lu dans app_secrets au moment de l'appel : il n'apparaît pas dans la définition du job.
select cron.schedule(
  'motiv-notify',
  '*/15 * * * *',
  $$select net.http_post(
      url := 'https://gizlmwnknbkexqvfvyrn.supabase.co/functions/v1/notify',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')),
      body := '{}'::jsonb
    )$$
);
