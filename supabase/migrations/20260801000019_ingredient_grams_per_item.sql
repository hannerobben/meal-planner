alter table public.ingredients
    add column grams_per_item numeric null,
    add constraint ingredients_base_unit_check check (base_unit in ('g', 'ml', 'item'));