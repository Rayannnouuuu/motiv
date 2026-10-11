-- Vérifie qu'un utilisateur authentifié ne voit ni n'écrit les lignes d'un autre.
-- À lancer tel quel (outil execute_sql ou éditeur SQL Supabase) : tout est annulé à la fin.
-- Attendu : chaque table visible = 0 pour l'utilisateur A, own_insert = ok,
-- insert_other_user = 42501 (refus RLS), update_other_user = 0 ligne.
begin;

create temp table rls_result (check_name text, outcome text) on commit drop;
grant all on rls_result to authenticated;

-- Deux utilisateurs de test, et des lignes appartenant à B (en tant que postgres, RLS ignorée).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'rls-a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-b@test.invalid');
insert into public.songs (id, user_id, title, status)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'B song', 'learning');
insert into public.sport_programs (id, user_id, name)
  values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', 'B prog');
insert into public.program_exercises (user_id, program_id, name, target_sets, target_reps)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b2', 'B exo', 3, 10);
insert into public.guitar_sessions (id, user_id, day, duration_min, flow_rating, desire_rating)
  values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000000b', '2026-10-11', 60, 3, 3);
insert into public.guitar_session_items (user_id, session_id, exercise_id)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b3', 'legato-4');
insert into public.sport_sessions (id, user_id, day, program_id, duration_min, flow_rating, desire_rating)
  values ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-00000000000b', '2026-10-11', '00000000-0000-0000-0000-0000000000b2', 50, 3, 3);
insert into public.body_metrics (user_id, day, weight_kg)
  values ('00000000-0000-0000-0000-00000000000b', '2026-10-11', 80);
insert into public.challenges (user_id, domain, level, kind, target, status, created_on)
  values ('00000000-0000-0000-0000-00000000000b', 'guitar', 1, 'song', '{}', 'active', '2026-10-11');

-- On devient A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

insert into rls_result
select 'visible.songs', count(*)::text from public.songs union all
select 'visible.guitar_sessions', count(*)::text from public.guitar_sessions union all
select 'visible.guitar_session_items', count(*)::text from public.guitar_session_items union all
select 'visible.sport_programs', count(*)::text from public.sport_programs union all
select 'visible.program_exercises', count(*)::text from public.program_exercises union all
select 'visible.sport_sessions', count(*)::text from public.sport_sessions union all
select 'visible.sport_sets', count(*)::text from public.sport_sets union all
select 'visible.body_metrics', count(*)::text from public.body_metrics union all
select 'visible.challenges', count(*)::text from public.challenges;

do $$
begin
  insert into public.songs (title, status) values ('A song', 'learning'); -- user_id = auth.uid() par défaut
  insert into rls_result values ('own_insert', 'ok');
exception when others then
  insert into rls_result values ('own_insert', sqlstate);
end $$;

do $$
begin
  insert into public.songs (user_id, title, status) values ('00000000-0000-0000-0000-00000000000b', 'x', 'learning');
  insert into rls_result values ('insert_other_user', 'ACCEPTÉ (faille)');
exception when others then
  insert into rls_result values ('insert_other_user', sqlstate);
end $$;

with u as (update public.songs set title = 'pwned' where id = '00000000-0000-0000-0000-0000000000b1' returning 1)
insert into rls_result select 'update_other_user', count(*)::text from u;

select * from rls_result;

rollback;
