import type { IngredientContract } from '../model/ingredient.contract.ts';

export function ingredientUnit(ingredientId: string | null, ingredients: IngredientContract[]): string {
    if (!ingredientId) return '';
    const ing = ingredients.find((i) => i.id === ingredientId);
    return ing?.base_unit !== 'item' ? (ing?.base_unit ?? '') : '';
}
