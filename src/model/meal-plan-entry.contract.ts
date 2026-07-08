import type { RecipeContract } from './recipe.contract.ts';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface MealPlanEntryContract {
    id: string;
    household_id: string;
    date: string;
    meal_type: MealType;
    recipe_id: string | null;
    free_text: string | null;
    recipe?: RecipeContract;
}
