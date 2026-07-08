create table public.recipe_ingredients (
    id              uuid primary key default gen_random_uuid(),
    recipe_id       uuid not null references public.recipes(id) on delete cascade,
    ingredient_id   uuid not null references public.ingredients(id) on delete restrict,
    quantity        numeric not null
);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients via owned recipe"
    on public.recipe_ingredients
    for all
    using (
        recipe_id in (
            select id from public.recipes
            where household_id = (select household_id from public.users where id = auth.uid())
        )
    )
    with check (
        recipe_id in (
            select id from public.recipes
            where household_id = (select household_id from public.users where id = auth.uid())
        )
    );

grant select, insert, update, delete on public.recipe_ingredients to authenticated;
