alter table public.instruktorzy
  add column if not exists etat text;

alter table public.instruktorzy
  add column if not exists email text;

alter table public.instruktorzy
  add column if not exists user_id uuid references auth.users(id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'instruktorzy_etat_check'
      and conrelid = 'public.instruktorzy'::regclass
  ) then
    alter table public.instruktorzy
      add constraint instruktorzy_etat_check
      check (etat is null or etat in (
        'pełny etat',
        '3/4 etatu',
        '1/2 etatu',
        '1/4 etatu',
        'zlecenie'
      ));
  end if;
end $$;

update public.instruktorzy
set etat = 'pełny etat'
where etat is null;

alter table public.instruktorzy enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'instruktorzy'
      and policyname = 'Wlasciciel zarzadza instruktorami'
  ) then
    create policy "Wlasciciel zarzadza instruktorami"
      on public.instruktorzy
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
