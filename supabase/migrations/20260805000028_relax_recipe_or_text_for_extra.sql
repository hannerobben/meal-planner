ALTER TABLE public.meal_plan_entries
    DROP CONSTRAINT recipe_or_text,
    ADD CONSTRAINT recipe_or_text CHECK (
        meal_type = 'extra' OR recipe_id IS NOT NULL OR free_text IS NOT NULL
    );
