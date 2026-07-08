create type public.ingredient_category as enum (
    'meat',
    'dairy',
    'fruit',
    'vegetable',
    'other'
);

create type public.meal_type as enum (
    'breakfast',
    'lunch',
    'dinner',
    'snack'
);
