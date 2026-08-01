export type IngredientCategory = 'meat' | 'dairy' | 'fruit' | 'vegetable' | 'other';

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
    'fruit',
    'vegetable',
    'meat',
    'dairy',
    'other'
];

export type IngredientUnit = 'g' | 'ml' | 'item';

export const INGREDIENT_UNITS: IngredientUnit[] = ['g', 'ml', 'item'];

export interface IngredientContract {
    id: string;
    household_id: string;
    name: string;
    category: IngredientCategory;
    base_unit: IngredientUnit;
    grams_per_item: number | null;
    calories_per_100: number;
    protein_g_per_100: number;
    carbs_g_per_100: number;
    fat_g_per_100: number;
}
