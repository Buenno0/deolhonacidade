-- Conquistas de primeira vez: responder "ainda está rolando?", perguntar,
-- responder a um pedido e compartilhar. (O primeiro post já era "Primeiro olhar".)

create or replace function public.check_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_posts integer;
  v_confirmed integer;
  v_fast integer;
  v_owl integer;
  v_detective integer;
  v_views integer;
  v_streak integer;
  v_voted boolean;
  v_asked boolean;
  v_answered boolean;
  v_shared boolean;
begin
  if p_user is null then return; end if;

  select count(*) filter (where status in ('published', 'expired')),
         count(*) filter (where confirm_count > 0),
         count(*) filter (where confirm_count > 0
                            and extract(hour from created_at at time zone 'America/Sao_Paulo') < 5),
         coalesce(max(view_count), 0),
         bool_or(request_id is not null and status in ('published', 'expired'))
  into v_posts, v_confirmed, v_owl, v_views, v_answered
  from public.posts where user_id = p_user;

  select count(*) into v_fast
  from public.posts p join public.requests r on r.id = p.request_id
  where p.user_id = p_user and p.status in ('published', 'expired')
    and p.created_at - r.created_at <= interval '15 minutes';

  select count(*) into v_detective
  from public.post_votes v join public.posts p on p.id = v.post_id
  where v.user_id = p_user and not v.still and p.deny_count >= 3 and p.deny_count > p.confirm_count;

  select exists (select 1 from public.post_votes where user_id = p_user) into v_voted;
  select exists (select 1 from public.requests where user_id = p_user) into v_asked;
  select exists (select 1 from public.xp_events where user_id = p_user and kind = 'compartilhou') into v_shared;
  select streak_days into v_streak from public.profiles where id = p_user;

  insert into public.user_badges (user_id, badge, tier)
  select p_user, b.badge, b.tier
  from (values
    ('primeiro_olhar', 1, v_posts >= 1),
    ('testemunha', 1, v_voted),
    ('primeira_pergunta', 1, v_asked),
    ('mao_amiga', 1, coalesce(v_answered, false)),
    ('espalhou', 1, v_shared),
    ('olho_clinico', 1, v_confirmed >= 5), ('olho_clinico', 2, v_confirmed >= 25), ('olho_clinico', 3, v_confirmed >= 100),
    ('pronto_socorro', 1, v_fast >= 3), ('pronto_socorro', 2, v_fast >= 10), ('pronto_socorro', 3, v_fast >= 30),
    ('coruja', 1, v_owl >= 1), ('coruja', 2, v_owl >= 5), ('coruja', 3, v_owl >= 15),
    ('detetive', 1, v_detective >= 1), ('detetive', 2, v_detective >= 5), ('detetive', 3, v_detective >= 20),
    ('viral', 1, v_views >= 25), ('viral', 2, v_views >= 100), ('viral', 3, v_views >= 500),
    ('sempre_de_olho', 1, coalesce(v_streak, 0) >= 3), ('sempre_de_olho', 2, coalesce(v_streak, 0) >= 7),
    ('sempre_de_olho', 3, coalesce(v_streak, 0) >= 30)
  ) as b(badge, tier, earned)
  where b.earned
  on conflict do nothing;
end;
$$;

-- Negar também é ajudar: +1 XP (e conta para a sequência e para "Testemunha").
-- Recria o vote_post só para acrescentar esse ramo.
create or replace function public.vote_post(p_id uuid, p_still boolean, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  p public.posts;
  inserted integer;
  denier uuid;
begin
  select * into p from public.posts where id = p_id and status = 'published' and expires_at > now();
  if p.id is null then
    raise exception 'Esse post já sumiu' using errcode = 'P0002';
  end if;
  if p.user_id = uid then
    raise exception 'Você não pode confirmar o próprio post' using errcode = '42501';
  end if;
  if not extensions.st_dwithin(p.location, pt, 1000) then
    raise exception 'Chegue mais perto (até 1 km) para responder' using errcode = '22023';
  end if;

  insert into public.post_votes (post_id, user_id, still) values (p_id, uid, p_still)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    raise exception 'Você já respondeu sobre este post' using errcode = '23505';
  end if;

  if p_still then
    update public.posts
    set confirm_count = confirm_count + 1,
        last_confirmed_at = now(),
        expires_at = least(created_at + interval '12 hours', greatest(expires_at, now() + interval '1 hour'))
    where id = p_id
    returning * into p;
    perform public.grant_xp(p.user_id, 'post_confirmado', 10, p_id);
    perform public.grant_xp(uid, 'confirmou', 2, p_id);
  else
    update public.posts
    set deny_count = deny_count + 1,
        expires_at = case
          when deny_count + 1 >= 3 and deny_count + 1 > confirm_count then now()
          else greatest(now() + interval '5 minutes', expires_at - interval '1 hour')
        end
    where id = p_id
    returning * into p;
    perform public.grant_xp(uid, 'negou', 1, p_id);
    if p.expires_at <= now() then
      for denier in select user_id from public.post_votes where post_id = p_id and not still loop
        perform public.grant_xp(denier, 'detetive', 5, p_id);
      end loop;
    end if;
  end if;

  perform public.log_access(uid, case when p_still then 'confirm_post' else 'deny_post' end, p_id);
  return jsonb_build_object(
    'confirm_count', p.confirm_count,
    'deny_count', p.deny_count,
    'expires_at', p.expires_at,
    'last_confirmed_at', p.last_confirmed_at
  );
end;
$$;

-- Perguntar: +2 XP (o limite de 3 perguntas por hora já segura o abuso)
create or replace function public.create_request(p_lat double precision, p_lng double precision, p_question text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_city integer;
  v_id uuid;
begin
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'O ponto precisa estar dentro da cidade' using errcode = '22023';
  end if;
  if (select count(*) from public.requests where user_id = uid and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Limite de 3 perguntas por hora atingido' using errcode = '54000';
  end if;

  insert into public.requests (user_id, city_id, location, question)
  values (uid, v_city, pt, btrim(p_question))
  returning id into v_id;
  perform public.log_access(uid, 'create_request', v_id);
  perform public.grant_xp(uid, 'pergunta', 2, v_id);
  return v_id;
end;
$$;

-- Compartilhar (logado): +1 XP, uma vez por post, e a conquista "Espalhou"
create or replace function public.record_interaction(p_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  who text := coalesce(
    auth.uid()::text,
    coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), headers ->> 'x-real-ip', '')
      || '|' || coalesce(headers ->> 'user-agent', '')
  );
  inserted integer;
  v_views integer;
  v_author uuid;
begin
  if p_kind not in ('view', 'share') then
    raise exception 'Interação inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts where id = p_id and status = 'published' and expires_at > now()) then
    return;
  end if;
  insert into public.post_interactions (post_id, viewer, kind)
  values (p_id, md5(who || '|' || p_id::text), p_kind)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  if p_kind = 'view' then
    update public.posts set view_count = view_count + 1 where id = p_id returning view_count, user_id into v_views, v_author;
    if v_views in (25, 100, 500) then
      perform public.check_badges(v_author);
    end if;
  else
    update public.posts set share_count = share_count + 1 where id = p_id returning user_id into v_author;
    if auth.uid() is not null and auth.uid() <> v_author then
      perform public.grant_xp(auth.uid(), 'compartilhou', 1, p_id);
    end if;
  end if;
end;
$$;

-- Quem já fez essas coisas antes ganha as de primeira vez, sem festa
select public.check_badges(id) from public.profiles;
update public.user_badges set seen_at = earned_at
where seen_at is null and badge in ('testemunha', 'primeira_pergunta', 'mao_amiga', 'espalhou');
