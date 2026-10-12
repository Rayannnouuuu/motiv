-- Un seul défi actif par utilisateur, domaine et niveau (deux appareils qui s'ouvrent en même temps ne créent pas de doublon).
create unique index if not exists challenges_one_active on public.challenges (user_id, domain, level) where status = 'active';
