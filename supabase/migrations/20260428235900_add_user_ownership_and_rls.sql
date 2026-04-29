create extension if not exists "pgcrypto";

alter table public.tabs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.todos
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.todos t
set user_id = tabs.user_id
from public.tabs
where t.tab_id = tabs.id
  and t.user_id is null
  and tabs.user_id is not null;

delete from public.todos
where user_id is null;

delete from public.tabs
where user_id is null;

alter table public.tabs
  alter column user_id set not null;

alter table public.todos
  alter column user_id set not null;

drop index if exists public.tabs_position_key;
create unique index if not exists tabs_user_position_key
on public.tabs(user_id, position);

create index if not exists todos_user_tab_position_idx
on public.todos(user_id, tab_id, position);

create index if not exists todos_user_parent_idx
on public.todos(user_id, parent_id);

create or replace function public.enforce_todo_tab_user_match()
returns trigger
language plpgsql
as $$
declare
  tab_user_id uuid;
begin
  select user_id into tab_user_id
  from public.tabs
  where id = new.tab_id;

  if tab_user_id is null then
    raise exception 'Tab % does not exist', new.tab_id;
  end if;

  if new.user_id is null then
    new.user_id := tab_user_id;
  end if;

  if new.user_id <> tab_user_id then
    raise exception 'Todo user_id must match tab owner';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_todo_tab_user_match on public.todos;
create trigger ensure_todo_tab_user_match
before insert or update on public.todos
for each row
execute function public.enforce_todo_tab_user_match();

alter table public.tabs enable row level security;
alter table public.todos enable row level security;

drop policy if exists "Allow anon read tabs" on public.tabs;
drop policy if exists "Allow anon insert tabs" on public.tabs;
drop policy if exists "Allow anon update tabs" on public.tabs;
drop policy if exists "Allow anon delete tabs" on public.tabs;
drop policy if exists "Allow anon read todos" on public.todos;
drop policy if exists "Allow anon insert todos" on public.todos;
drop policy if exists "Allow anon update todos" on public.todos;
drop policy if exists "Allow anon delete todos" on public.todos;

drop policy if exists "Tabs owner can select" on public.tabs;
drop policy if exists "Tabs owner can insert" on public.tabs;
drop policy if exists "Tabs owner can update" on public.tabs;
drop policy if exists "Tabs owner can delete" on public.tabs;
drop policy if exists "Todos owner can select" on public.todos;
drop policy if exists "Todos owner can insert" on public.todos;
drop policy if exists "Todos owner can update" on public.todos;
drop policy if exists "Todos owner can delete" on public.todos;

create policy "Tabs owner can select"
on public.tabs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Tabs owner can insert"
on public.tabs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Tabs owner can update"
on public.tabs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Tabs owner can delete"
on public.tabs
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Todos owner can select"
on public.todos
for select
to authenticated
using (auth.uid() = user_id);

create policy "Todos owner can insert"
on public.todos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Todos owner can update"
on public.todos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Todos owner can delete"
on public.todos
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.merge_anonymous_data(source_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  src_tab record;
  destination_tab_id uuid;
  next_tab_position integer;
begin
  if target_user_id is null then
    raise exception 'merge_anonymous_data requires authenticated user';
  end if;

  if source_user_id is null or source_user_id = target_user_id then
    return;
  end if;

  for src_tab in
    select id, label, position
    from public.tabs
    where user_id = source_user_id
    order by position asc, created_at asc, id asc
  loop
    select id
    into destination_tab_id
    from public.tabs
    where user_id = target_user_id
      and lower(trim(label)) = lower(trim(src_tab.label))
    order by created_at asc, id asc
    limit 1;

    if destination_tab_id is null then
      select coalesce(max(position), 0) + 1000
      into next_tab_position
      from public.tabs
      where user_id = target_user_id;

      insert into public.tabs (label, position, user_id)
      values (src_tab.label, next_tab_position, target_user_id)
      returning id into destination_tab_id;
    end if;

    update public.todos
    set tab_id = destination_tab_id,
        user_id = target_user_id
    where user_id = source_user_id
      and tab_id = src_tab.id;
  end loop;

  delete from public.tabs
  where user_id = source_user_id;

  with ranked_tabs as (
    select
      id,
      row_number() over (
        partition by user_id
        order by position asc, created_at asc, id asc
      ) as rn
    from public.tabs
    where user_id = target_user_id
  )
  update public.tabs t
  set position = ranked_tabs.rn * 1000
  from ranked_tabs
  where ranked_tabs.id = t.id;

  with ranked_todos as (
    select
      id,
      row_number() over (
        partition by user_id, tab_id
        order by position asc, created_at asc, id asc
      ) as rn
    from public.todos
    where user_id = target_user_id
  )
  update public.todos td
  set position = ranked_todos.rn * 1000
  from ranked_todos
  where ranked_todos.id = td.id;
end;
$$;

revoke all on function public.merge_anonymous_data(uuid) from public;
grant execute on function public.merge_anonymous_data(uuid) to authenticated;
