-- Physical verification sessions and per-accession observations.
create table if not exists public.verification_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'In Progress' check (status in ('In Progress','Completed','Cancelled')),
  section text,
  rack text,
  shelf text,
  notes text,
  created_by uuid references auth.users(id),
  completed_by uuid references auth.users(id)
);

create table if not exists public.verification_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.verification_sessions(id) on delete cascade,
  accession_id uuid not null references public.accessions(id) on delete restrict,
  result text not null check (result in ('Found','Missing','Damaged','Wrong Location','Not Verified')),
  found_location_id uuid references public.location_master(id),
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id),
  notes text,
  unique (session_id, accession_id)
);

create index if not exists idx_verification_sessions_status on public.verification_sessions(status);
create index if not exists idx_verification_items_session on public.verification_items(session_id);
create index if not exists idx_verification_items_accession on public.verification_items(accession_id);

alter table public.verification_sessions enable row level security;
alter table public.verification_items enable row level security;
