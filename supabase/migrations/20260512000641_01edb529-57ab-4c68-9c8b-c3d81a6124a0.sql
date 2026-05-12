-- Subscription tier enum
create type public.subscription_tier as enum ('gratuito','basico','intermediario','completo');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Subscriptions table (server-only writes)
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier public.subscription_tier not null default 'gratuito',
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- intentionally NO insert/update/delete policies for users; only service role writes (e.g., payment webhook)

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Auto-create profile + free subscription on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''));
  insert into public.subscriptions (user_id, tier) values (new.id, 'gratuito');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();