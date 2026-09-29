-- Quem já tinha posts antes da gamificação ganha as conquistas que já merecia
-- (sem XP retroativo: XP conta a partir de agora). Ficam como "vistas" para
-- não disparar uma festa de conquistas antigas.
select public.check_badges(id) from public.profiles;
update public.user_badges set seen_at = earned_at where seen_at is null and earned_at < now() + interval '1 minute';
