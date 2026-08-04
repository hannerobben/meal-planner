import type { RecipeContract } from './recipe.contract.ts';
import type { MealPlanEntryAddonIngredientContract } from './meal-plan-entry-addon-ingredient.contract.ts';
import type { MealPlanEntryAddonRecipeContract } from './meal-plan-entry-addon-recipe.contract.ts';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealPlanEntryContract {
    id: string;
    household_id: string;
    date: string;
    meal_type: MealType;
    slot_index: number;
    recipe_id: string | null;
    free_text: string | null;
    user_id: string | null;
    recipe?: RecipeContract;
    addon_ingredients?: MealPlanEntryAddonIngredientContract[];
    addon_recipes?: MealPlanEntryAddonRecipeContract[];
}
