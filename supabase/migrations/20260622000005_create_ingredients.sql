create table public.ingredients (
    id                  uuid primary key default gen_random_uuid(),
    household_id        uuid not null references public.households(id),
    name                text not null,
    category            public.ingredient_category not null,
    base_unit           text not null,
    calories_per_100    numeric not null default 0,
    protein_g_per_100   numeric not null default 0,
    carbs_g_per_100     numeric not null default 0,
    fat_g_per_100       numeric not null default 0
);

alter table public.ingredients enable row level security;

create policy "household ingredient access"
    on public.ingredients
    for all
    using (household_id = public.get_my_household_id())
    with check (household_id = public.get_my_household_id());

grant select, insert, update, delete on public.ingredients to authenticated;