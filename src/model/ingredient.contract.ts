export type IngredientCategory = 'meat' | 'dairy' | 'fruit' | 'vegetable' | 'other';

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
    'fruit',
    'vegetable',
    'meat',
    'dairy',
    'other'
];

export interface IngredientContract {
    id: string;
    household_id: string;
    name: string;
    category: IngredientCategory;
    base_unit: string;
    calories_per_100: number;
    protein_g_per_100: number;
    carbs_g_per_100: number;
    fat_g_per_100: number;
}
