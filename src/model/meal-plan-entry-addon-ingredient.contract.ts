import type { IngredientContract } from './ingredient.contract.ts';

export interface MealPlanEntryAddonIngredientContract {
    id: string;
    meal_plan_entry_id: string;
    ingredient_id: string;
    quantity: number;
    ingredient?: IngredientContract;
}