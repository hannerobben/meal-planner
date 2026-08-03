alter table public.recipes
    add column not_suggested boolean not null default false;