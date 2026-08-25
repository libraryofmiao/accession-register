-- Receiving sources for SDLM Miao.
-- Run this migration in Supabase SQL Editor after schema.sql.

alter table public.accessions
  add column if not exists source text;

alter table public.accessions
  add column if not exists rrrlf_scheme text;

-- Allowed receiving sources. The library does not use a normal purchase source.
alter table public.accessions
  drop constraint if exists accessions_source_check;

alter table public.accessions
  add constraint accessions_source_check
  check (source is null or source in ('State Central Library','RRRLF','Donation/Gift'));

-- RRRLF has exactly three schemes. It is only valid when source is RRRLF.
alter table public.accessions
  drop constraint if exists accessions_rrrlf_scheme_check;

alter table public.accessions
  add constraint accessions_rrrlf_scheme_check
  check (
    (source = 'RRRLF' and rrrlf_scheme in (
      'Donated/Gifted by RRRLF',
      'Purchased with Assistance from RRRLF',
      'Matching Scheme'
    ))
    or
    (source is distinct from 'RRRLF' and rrrlf_scheme is null)
  );

create index if not exists idx_accessions_source on public.accessions(source);
create index if not exists idx_accessions_rrrlf_scheme on public.accessions(rrrlf_scheme);

-- Remove legacy Reference No. fields if a previous draft schema created one.
alter table public.accessions drop column if exists rrrlf_reference_no;
alter table public.accessions drop column if exists reference_no;
