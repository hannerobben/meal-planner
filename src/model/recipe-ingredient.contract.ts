import type { IngredientContract } from './ingredient.contract.ts';

export interface RecipeIngredientContract {
    id: string;
    recipe_id: string;
    ingredient_id: string;
    quantity: number;
    ingredient?: IngredientContract;
}
