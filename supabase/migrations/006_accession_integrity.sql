-- 006: DDC-number based Subject population.
-- The ddc_master table stores the library's approved DDC -> Subject mappings.
-- New/updated accession rows automatically use the exact DDC master subject.

create or replace function public.lookup_ddc_subject(p_ddc text)
returns text
language sql
stable
as $$
  select subject from public.ddc_master
  where lower(trim(ddc_number)) = lower(trim(p_ddc))
  limit 1;
$$;

create or replace function public.populate_accession_subject_from_ddc()
returns trigger
language plpgsql
as $$
declare
  mapped_subject text;
begin
  if nullif(trim(new.ddc_number), '') is not null then
    mapped_subject := public.lookup_ddc_subject(new.ddc_number);
    if mapped_subject is not null and trim(mapped_subject) <> '' then
      new.subject := mapped_subject;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_accessions_ddc_subject on public.accessions;
create trigger trg_accessions_ddc_subject
before insert or update of ddc_number on public.accessions
for each row execute function public.populate_accession_subject_from_ddc();

create index if not exists idx_ddc_master_number on public.ddc_master(ddc_number);

-- Backfill existing accession records wherever an exact DDC master match exists.
update public.accessions a
set subject = d.subject
from public.ddc_master d
where lower(trim(a.ddc_number)) = lower(trim(d.ddc_number))
  and d.subject is not null
  and trim(d.subject) <> '';
