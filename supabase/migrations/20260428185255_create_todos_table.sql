create extension if not exists "pgcrypto";

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  done boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_todos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_todos_updated_at on public.todos;

create trigger set_todos_updated_at
before update on public.todos
for each row
execute function public.set_todos_updated_at();

alter table public.todos enable row level security;

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
