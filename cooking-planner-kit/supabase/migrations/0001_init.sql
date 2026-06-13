-- Plans table. The whole plan (preferences, meals, substitutions) lives in a
-- jsonb column so the contract in src/domain/types.ts stays the single source
-- of truth — changing it does not force a SQL migration.
create table if not exists public.plans (
  id uuid primary key,
  user_id text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_updated_at_idx
  on public.plans (updated_at desc);

create index if not exists plans_user_id_idx
  on public.plans (user_id);

-- Phase 3 is anonymous-first. When auth lands, swap this for a policy that
-- scopes rows to auth.uid().
alter table public.plans enable row level security;

drop policy if exists "anon read plans" on public.plans;
create policy "anon read plans"
  on public.plans for select
  using (true);

drop policy if exists "anon write plans" on public.plans;
create policy "anon write plans"
  on public.plans for insert
  with check (true);

drop policy if exists "anon update plans" on public.plans;
create policy "anon update plans"
  on public.plans for update
  using (true)
  with check (true);

drop policy if exists "anon delete plans" on public.plans;
create policy "anon delete plans"
  on public.plans for delete
  using (true);
