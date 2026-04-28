create extension if not exists "pgcrypto";

create table if not exists public.tabs (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(trim(label)) > 0),
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.tabs (label, position)
select t.label, t.position
from (
  values
    ('Work', 1000),
    ('Personal', 2000),
    ('Groceries', 3000)
) as t(label, position)
where not exists (select 1 from public.tabs);

alter table public.todos
  add column if not exists tab_id uuid,
  add column if not exists parent_id uuid,
  add column if not exists position integer;

with first_tab as (
  select id
  from public.tabs
  order by position asc
  limit 1
)
update public.todos
set tab_id = (select id from first_tab)
where tab_id is null;

with ranked as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.todos
  where position is null
)
update public.todos t
set position = ranked.rn * 1000
from ranked
where ranked.id = t.id;

alter table public.todos
  alter column tab_id set not null,
  alter column position set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_tab_id_fkey'
  ) then
    alter table public.todos
      add constraint todos_tab_id_fkey
      foreign key (tab_id)
      references public.tabs(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_parent_id_fkey'
  ) then
    alter table public.todos
      add constraint todos_parent_id_fkey
      foreign key (parent_id)
      references public.todos(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'todos_parent_not_self'
  ) then
    alter table public.todos
      add constraint todos_parent_not_self
      check (parent_id is null or parent_id <> id);
  end if;
end $$;

create unique index if not exists tabs_position_key on public.tabs(position);
create index if not exists todos_tab_position_idx on public.todos(tab_id, position);
create index if not exists todos_parent_id_idx on public.todos(parent_id);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_tabs_updated_at on public.tabs;
create trigger set_tabs_updated_at
before update on public.tabs
for each row
execute function public.set_row_updated_at();

drop trigger if exists set_todos_updated_at on public.todos;
create trigger set_todos_updated_at
before update on public.todos
for each row
execute function public.set_row_updated_at();

alter table public.tabs enable row level security;
alter table public.todos enable row level security;

drop policy if exists "Allow anon read tabs" on public.tabs;
create policy "Allow anon read tabs"
on public.tabs
for select
to anon, authenticated
using (true);

drop policy if exists "Allow anon insert tabs" on public.tabs;
create policy "Allow anon insert tabs"
on public.tabs
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow anon update tabs" on public.tabs;
create policy "Allow anon update tabs"
on public.tabs
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow anon delete tabs" on public.tabs;
create policy "Allow anon delete tabs"
on public.tabs
for delete
to anon, authenticated
using (true);

drop policy if exists "Allow anon read todos" on public.todos;
create policy "Allow anon read todos"
on public.todos
for select
to anon, authenticated
using (true);

drop policy if exists "Allow anon insert todos" on public.todos;
create policy "Allow anon insert todos"
on public.todos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Allow anon update todos" on public.todos;
create policy "Allow anon update todos"
on public.todos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Allow anon delete todos" on public.todos;
create policy "Allow anon delete todos"
on public.todos
for delete
to anon, authenticated
using (true);
