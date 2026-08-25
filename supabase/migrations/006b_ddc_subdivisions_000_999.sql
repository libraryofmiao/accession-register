-- DDC 000-999 three-digit subdivision structure.
-- Creates all 1,000 three-digit codes (000 through 999).
-- The subject is inherited from the corresponding DDC hundred division.
-- Exact detailed DDC captions can be loaded later from the library's licensed/supplied DDC dataset.

insert into public.ddc_master (ddc_number, subject)
select lpad(n::text, 3, '0'),
       coalesce(d.subject, 'DDC ' || lpad((n / 100) * 100::text, 3, '0') || ' Division')
from generate_series(0,999) as g(n)
left join public.ddc_master d
  on d.ddc_number = lpad(((n / 100) * 100)::text, 3, '0')
on conflict (ddc_number) do nothing;

create index if not exists idx_ddc_master_number on public.ddc_master(ddc_number);
