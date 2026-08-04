import { supabase } from './supabase.ts';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';

const SELECT = '*, recipe:recipes(*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))), addon_ingredients:meal_plan_entry_addon_ingredients(*, ingredient:ingredients(*))';

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
        slotIndex: number,
        recipeId: string | null,
        freeText: string | null,
        userId: string | null = null
    ): Promise<MealPlanEntryContract> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .insert({ household_id: householdId, date, meal_type: mealType, slot_index: slotIndex, recipe_id: recipeId, free_text: freeText, user_id: userId })
            .select(SELECT)
            .single();
        if (error) throw error;
        return data;
    }

    public static async update(
        id: string,
        recipeId: string | null,
        freeText: string | null,
        userId: string | null = null
    ): Promise<MealPlanEntryContract> {
        const { data, error } = await supabase
            .from('meal_plan_entries')
            .update({ recipe_id: recipeId, free_text: freeText, user_id: userId })
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

    public static async replaceAddonIngredients(
        entryId: string,
        lines: { ingredientId: string; quantity: number }[]
    ): Promise<void> {
        const { error: delError } = await supabase
            .from('meal_plan_entry_addon_ingredients')
            .delete()
            .eq('meal_plan_entry_id', entryId);
        if (delError) throw delError;
        if (!lines.length) return;
        const { error } = await supabase
            .from('meal_plan_entry_addon_ingredients')
            .insert(lines.map((l) => ({ meal_plan_entry_id: entryId, ingredient_id: l.ingredientId, quantity: l.quantity })));
        if (error) throw error;
    }
}
