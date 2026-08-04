import type { RecipeIngredientContract } from './recipe-ingredient.contract.ts';
import type { MealType } from './meal-plan-entry.contract.ts';

export interface RecipeContract {
    id: string;
    household_id: string;
    name: string;
    type: MealType[];
    notes: string | null;
    image_url: string | null;
    not_suggested: boolean;
    is_addon: boolean;
    created_at: string;
    ingredients?: RecipeIngredientContract[];
}
