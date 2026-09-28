-- De Olho na Cidade: schema base
create extension if not exists postgis with schema extensions;
create extension if not exists pg_cron;

-- Cidades atendidas (id = código IBGE)
create table public.cities (
  id integer primary key,
  name text not null,
  uf char(2) not null,
  boundary extensions.geography(MultiPolygon, 4326) not null
);
create index cities_boundary_idx on public.cities using gist (boundary);

-- Perfil privado de cada usuário (nunca exposto publicamente)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  banned_at timestamptz,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create type public.post_status as enum ('pending', 'published', 'hidden', 'expired');
create type public.post_category as enum (
  'transito', 'alagamento', 'acidente', 'evento', 'seguranca', 'falta_energia', 'obra', 'outro'
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city_id integer not null references public.cities (id),
  location extensions.geography(Point, 4326) not null,
  category public.post_category not null,
  caption text check (char_length(caption) <= 140),
  photo_path text,
  status public.post_status not null default 'pending',
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);
create index posts_location_idx on public.posts using gist (location);
create index posts_active_idx on public.posts (city_id, expires_at) where status = 'published';
create index posts_user_created_idx on public.posts (user_id, created_at);

create table public.reports (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text check (char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Marco Civil da Internet, art. 15: guardar registros de acesso por 6 meses
create table public.access_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  post_id uuid,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index access_logs_created_idx on public.access_logs (created_at);

-- RLS: tudo fechado. O acesso público é feito só pelas funções abaixo,
-- que nunca devolvem user_id.
alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.access_logs enable row level security;

create policy "cidades são públicas" on public.cities for select using (true);
create policy "usuário lê o próprio perfil" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
