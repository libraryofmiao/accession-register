-- 006: DDC-number based Subject population.
-- Exact DDC master matches are preferred. If an exact entry is unavailable,
-- the first three digits are resolved against the 100 DDC divisions.

create table if not exists public.ddc_divisions (
  division_number text primary key check (division_number ~ '^[0-9]{3}$'),
  subject text not null
);

insert into public.ddc_divisions(division_number,subject) values
('000','Computer science, information & general works'),('010','Bibliography'),('020','Library & information sciences'),('030','Encyclopedias & books of facts'),('040','Unassigned'),('050','Magazines, journals & serials'),('060','Associations, organizations & museums'),('070','News media, journalism & publishing'),('080','Quotations'),('090','Manuscripts & rare books'),
('100','Philosophy'),('110','Metaphysics'),('120','Epistemology'),('130','Paranormal phenomena'),('140','Specific philosophical schools'),('150','Psychology'),('160','Logic'),('170','Ethics'),('180','Ancient, medieval & eastern philosophy'),('190','Modern western philosophy'),
('200','Religion'),('210','Philosophy & theory of religion'),('220','Bible'),('230','Christianity & Christian theology'),('240','Christian practice & observance'),('250','Christian pastoral practice & religious orders'),('260','Christian organization, social work & worship'),('270','History of Christianity'),('280','Christian denominations'),('290','Other religions'),
('300','Social sciences'),('310','Statistics'),('320','Political science'),('330','Economics'),('340','Law'),('350','Public administration & military science'),('360','Social problems & social services'),('370','Education'),('380','Commerce, communications & transportation'),('390','Customs, etiquette & folklore'),
('400','Language'),('410','Linguistics'),('420','English & Old English'),('430','Germanic languages; German'),('440','Romance languages; French'),('450','Italian, Romanian & related languages'),('460','Spanish & Portuguese languages'),('470','Italic languages; Latin'),('480','Hellenic languages; Classical Greek'),('490','Other languages'),
('500','Science'),('510','Mathematics'),('520','Astronomy'),('530','Physics'),('540','Chemistry'),('550','Earth sciences & geology'),('560','Fossils & prehistoric life'),('570','Biology'),('580','Plants'),('590','Animals'),
('600','Technology'),('610','Medicine & health'),('620','Engineering'),('630','Agriculture'),('640','Home & family management'),('650','Management & public relations'),('660','Chemical engineering'),('670','Manufacturing'),('680','Manufacture for specific uses'),('690','Buildings'),
('700','Arts & recreation'),('710','Area planning & landscape architecture'),('720','Architecture'),('730','Sculpture, ceramics & metalwork'),('740','Drawing & decorative arts'),('750','Painting'),('760','Printmaking & prints'),('770','Photography, computer art, film & video'),('780','Music'),('790','Sports, games & entertainment'),
('800','Literature'),('810','American literature in English'),('820','English & Old English literatures'),('830','German literature & literatures of related languages'),('840','French & related literatures'),('850','Italian, Romanian & related literatures'),('860','Spanish & Portuguese literatures'),('870','Latin & Italic literatures'),('880','Classical Greek & Hellenic literatures'),('890','Literatures of other languages'),
('900','History & geography'),('910','Geography & travel'),('920','Biography, genealogy & insignia'),('930','History of ancient world'),('940','History of Europe'),('950','History of Asia'),('960','History of Africa'),('970','History of North America'),('980','History of South America'),('990','History of other areas')
on conflict (division_number) do update set subject=excluded.subject;

create index if not exists idx_ddc_divisions_subject on public.ddc_divisions(subject);

create or replace function public.lookup_ddc_subject(p_ddc text)
returns text
language plpgsql
stable
as $$
declare
  exact_subject text;
  division_code text;
begin
  select subject into exact_subject
  from public.ddc_master
  where lower(trim(ddc_number)) = lower(trim(p_ddc))
  limit 1;
  if exact_subject is not null and trim(exact_subject) <> '' then
    return exact_subject;
  end if;

  division_code := substring(regexp_replace(trim(p_ddc), '[^0-9]', '', 'g') from 1 for 3);
  if division_code is null or length(division_code) <> 3 then
    return null;
  end if;

  select subject into exact_subject
  from public.ddc_divisions
  where division_number = division_code;
  return exact_subject;
end;
$$;

create or replace function public.populate_accession_subject_from_ddc()
returns trigger
language plpgsql
as $$
declare mapped_subject text;
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

update public.accessions a
set subject = public.lookup_ddc_subject(a.ddc_number)
where nullif(trim(a.ddc_number), '') is not null
  and public.lookup_ddc_subject(a.ddc_number) is not null;
