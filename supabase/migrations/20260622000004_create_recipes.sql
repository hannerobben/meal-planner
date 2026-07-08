create table public.recipes (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id),
    name          text not null,
    notes         text,
    type          public.meal_type not null default 'dinner',
    image_url     text,
    created_at    timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "household recipe access"
    on public.recipes
    for all
    using (household_id = public.get_my_household_id())
    with check (household_id = public.get_my_household_id());

grant select, insert, update, delete on public.recipes to authenticated;