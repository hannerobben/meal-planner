import { supabase } from './supabase.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export interface RawShoppingItem {
    recipe_name: string;
    quantity: number;
    ingredient: IngredientContract;
}

export class ShoppingApi {
    public static async getIngredientsForRange(
        householdId: string,
        from: string,
        to: string
    ): Promise<RawShoppingItem[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select('recipe:recipes(name, recipe_ingredients(quantity, ingredient:ingredients(*)))')
            .eq('household_id', householdId)
            .gte('date', from)
            .lte('date', to)
            .not('recipe_id', 'is', null);

        if (error) throw error;

        const result: RawShoppingItem[] = [];
        for (const entry of data ?? []) {
            const recipe = entry.recipe as unknown as {
                name: string;
                recipe_ingredients: { quantity: number; ingredient: IngredientContract }[];
            } | null;
            if (!recipe) continue;
            for (const ri of recipe.recipe_ingredients ?? []) {
                result.push({ recipe_name: recipe.name, quantity: ri.quantity, ingredient: ri.ingredient });
            }
        }
        return result;
    }
}
