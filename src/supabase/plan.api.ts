import { supabase } from './supabase.ts';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';

const SELECT = '*, recipe:recipes(*, ingredients:recipe_ingredients(*, ingredient:ingredients(*)))';

export class PlanApi {
    public static async getForRange(
        householdId: string,
        from: string,
        to: string
    ): Promise<MealPlanEntryContract[]> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .select(SELECT)
            .eq('household_id', householdId)
            .gte('date', from)
            .lte('date', to);

        if (error) throw error;
        return data ?? [];
    }

    public static async insert(
        householdId: string,
        date: string,
        mealType: MealType,
        recipeId: string | null,
        freeText: string | null
    ): Promise<MealPlanEntryContract> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .insert({ household_id: householdId, date, meal_type: mealType, recipe_id: recipeId, free_text: freeText })
            .select(SELECT)
            .single();
        if (error) throw error;
        return data;
    }

    public static async update(
        id: string,
        recipeId: string | null,
        freeText: string | null
    ): Promise<MealPlanEntryContract> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .update({ recipe_id: recipeId, free_text: freeText })
            .eq('id', id)
            .select(SELECT)
            .single();
        if (error) throw error;
        return data;
    }

    public static async remove(id: string): Promise<void> {
        const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);
        if (error) throw error;
    }
}
