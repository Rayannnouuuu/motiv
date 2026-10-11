-- Motiv v1 : schéma + Row Level Security (spec §5).
-- Ids générés côté client (upsert idempotent depuis la file hors-ligne).

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(trim(title)) > 0),
  status text not null check (status in ('learning', 'mastered')),
  mastered_on date,
  created_at timestamptz not null default now()
);

create table public.guitar_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  duration_min int not null check (duration_min > 0),
  flow_rating smallint not null check (flow_rating between 1 and 5),
  desire_rating smallint not null check (desire_rating between 1 and 5),
  xp int not null default 0,
  created_at timestamptz not null default now()
);
create index guitar_sessions_user_day on public.guitar_sessions (user_id, day);

create table public.guitar_session_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.guitar_sessions on delete cascade,
  exercise_id text,
  song_id uuid references public.songs on delete cascade,
  max_bpm int check (max_bpm > 0),
  marked_mastered boolean not null default false,
  check ((exercise_id is null) <> (song_id is null))
);
create index guitar_session_items_session on public.guitar_session_items (session_id);

create table public.sport_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(trim(name)) > 0),
  position int not null default 0,
  archived boolean not null default false
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  program_id uuid not null references public.sport_programs on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_sets int not null check (target_sets > 0),
  target_reps int not null check (target_reps > 0),
  position int not null default 0,
  archived boolean not null default false
);
create index program_exercises_program on public.program_exercises (program_id);

create table public.sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  program_id uuid not null references public.sport_programs,
  duration_min int not null check (duration_min > 0),
  flow_rating smallint not null check (flow_rating between 1 and 5),
  desire_rating smallint not null check (desire_rating between 1 and 5),
  xp int not null default 0,
  created_at timestamptz not null default now()
);
create index sport_sessions_user_day on public.sport_sessions (user_id, day);
create index sport_sessions_program on public.sport_sessions (program_id);

create table public.sport_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.sport_sessions on delete cascade,
  program_exercise_id uuid not null references public.program_exercises,
  set_index int not null check (set_index > 0),
  reps int not null check (reps > 0),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0)
);
create index sport_sets_session on public.sport_sets (session_id);
create index sport_sets_exercise on public.sport_sets (program_exercise_id);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 1),
  chest_cm numeric(5, 1),
  arm_cm numeric(5, 1),
  thigh_cm numeric(5, 1),
  check (num_nonnulls(weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm) > 0)
);
create index body_metrics_user_day on public.body_metrics (user_id, day);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  domain text not null check (domain in ('guitar', 'sport')),
  level int not null check (level > 0),
  kind text not null check (kind in ('bpm', 'song', 'weight', 'reps', 'sessionsInWeek')),
  target jsonb not null,
  easier boolean not null default false,
  status text not null check (status in ('active', 'done', 'replaced')),
  created_on date not null,
  blocked_since date,
  done_on date,
  rerolls int not null default 0 check (rerolls between 0 and 2)
);
create index challenges_user on public.challenges (user_id);

-- RLS : chaque utilisateur ne voit et n'écrit que ses lignes.
do $$
declare t text;
begin
  foreach t in array array[
    'songs', 'guitar_sessions', 'guitar_session_items', 'sport_programs', 'program_exercises',
    'sport_sessions', 'sport_sets', 'body_metrics', 'challenges'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;
