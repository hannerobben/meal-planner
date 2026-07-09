import type { MealType } from './meal-plan-entry.contract.ts';
import type { IngredientCategory } from './ingredient.contract.ts';

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
    breakfast: '#ffd6a5',
    lunch:     '#b5ead7',
    dinner:    '#ffb3ba',
    snack:     '#b3d9ff',
};

export const INGREDIENT_CATEGORY_COLORS: Record<IngredientCategory, string> = {
    fruit:     '#ffd6a5',
    vegetable: '#b5ead7',
    meat:      '#ffb3ba',
    dairy:     '#b3d9ff',
    other:     '#e0e0e0',
};
