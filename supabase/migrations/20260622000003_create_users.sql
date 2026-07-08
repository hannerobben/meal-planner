create table public.users (
    id            uuid primary key references auth.users(id) on delete cascade,
    household_id  uuid not null references public.households(id),
    display_name  text not null,
    created_at    timestamptz not null default now()
);

-- Security definer helper so policies can look up household_id without RLS recursion.
create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select household_id from public.users where id = auth.uid()
$$;

alter table public.users enable row level security;

create policy "users can read own household members"
    on public.users
    for select
    using (household_id = public.get_my_household_id());

create policy "users can update own record"
    on public.users
    for update
    using (id = auth.uid())
    with check (id = auth.uid() and household_id = public.get_my_household_id());

create policy "authenticated users can read their own household"
    on public.households
    for select
    using (id = public.get_my_household_id());

grant select, update on public.users to authenticated;
grant select on public.households to authenticated;