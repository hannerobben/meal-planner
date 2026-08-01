import type { IngredientContract } from '../model/ingredient.contract.ts';

export interface MacroTotals {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

export function ingredientFactor(quantity: number, ingredient: IngredientContract): number {
    if (ingredient.base_unit === 'item') {
        return (quantity * (ingredient.grams_per_item ?? 0)) / 100;
    }
    return quantity / 100;
}

export function sumMacros(
    ingredients: Array<{ quantity: number; ingredient?: IngredientContract | null }>
): MacroTotals {
    return ingredients.reduce(
        (acc, ri) => {
            if (!ri.ingredient) return acc;
            const f = ingredientFactor(ri.quantity, ri.ingredient);
            return {
                calories: acc.calories + ri.ingredient.calories_per_100 * f,
                protein_g: acc.protein_g + ri.ingredient.protein_g_per_100 * f,
                carbs_g: acc.carbs_g + ri.ingredient.carbs_g_per_100 * f,
                fat_g: acc.fat_g + ri.ingredient.fat_g_per_100 * f
            };
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
}
