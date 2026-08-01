alter table public.recipes alter column type drop default;

alter table public.recipes
    alter column type type public.meal_type[]
        using array[type]::public.meal_type[];

alter table public.recipes
    alter column type set default '{dinner}'::public.meal_type[];
