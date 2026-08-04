import type { RecipeContract } from './recipe.contract.ts';

export interface MealPlanEntryAddonRecipeContract {
    id: string;
    meal_plan_entry_id: string;
    recipe_id: string;
    recipe?: RecipeContract;
}
