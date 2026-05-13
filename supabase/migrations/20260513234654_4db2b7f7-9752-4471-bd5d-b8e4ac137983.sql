-- Per-user storage of onboarding answers and generated plan, replacing localStorage.
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb,
  plano jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "user_data_select_own" on public.user_data
  for select to authenticated using (auth.uid() = user_id);

create policy "user_data_insert_own" on public.user_data
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user_data_update_own" on public.user_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_data_set_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();
