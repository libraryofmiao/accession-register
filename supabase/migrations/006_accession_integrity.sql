-- Accession Register integrity rules.
-- Enforce the maximum of 3 authors at database level so the rule cannot be bypassed by direct API/database writes.
create or replace function public.enforce_max_three_accession_authors()
returns trigger
language plpgsql
as $$
declare
  author_count integer;
begin
  select count(*) into author_count
  from public.accession_authors
  where accession_id = new.accession_id
    and id <> coalesce(new.id, -1);

  if author_count >= 3 then
    raise exception 'An accession may have a maximum of 3 authors.' using errcode = 'check_violation';
  end if;

  if new.author_order is null or new.author_order not between 1 and 3 then
    raise exception 'Author order must be between 1 and 3.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accession_authors_max_three on public.accession_authors;
create trigger trg_accession_authors_max_three
before insert or update on public.accession_authors
for each row execute function public.enforce_max_three_accession_authors();

create unique index if not exists uq_accessions_accession_no
on public.accessions(accession_no);

create unique index if not exists uq_accession_authors_accession_order
on public.accession_authors(accession_id, author_order);
