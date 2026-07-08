import { supabase } from './supabase.ts';
import type { RecipeContract } from '../model/recipe.contract.ts';
import type { MealType } from '../model/meal-plan-entry.contract.ts';

export class RecipeApi {
    public static async getAll(householdId: string): Promise<RecipeContract[]> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
            .eq('household_id', householdId)
            .order('name');

        if (error) throw error;
        return data ?? [];
    }

    public static async getById(id: string): Promise<RecipeContract | undefined> {
        const { data, error } = await supabase
            .from('recipes')
            .select('*, ingredients:recipe_ingredients(*, ingredient:ingredients(*))')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ?? undefined;
    }

    public static async create(
        householdId: string,
        name: string,
        type: MealType,
        notes: string | null
    ): Promise<RecipeContract> {
        const { data, error } = await supabase
            .from('recipes')
            .insert({ household_id: householdId, name, type, notes })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    public static async update(
        id: string,
        name: string,
        type: MealType,
        notes: string | null,
        image_url: string | null
    ): Promise<void> {
        const { error } = await supabase
            .from('recipes')
            .update({ name, type, notes, image_url })
            .eq('id', id);
        if (error) throw error;
    }

    public static async uploadImage(recipeId: string, file: File): Promise<string> {
        const { error } = await supabase.storage
            .from('recipe-images')
            .upload(recipeId, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('recipe-images').getPublicUrl(recipeId);
        return data.publicUrl;
    }

    public static async deleteImage(recipeId: string): Promise<void> {
        await supabase.storage.from('recipe-images').remove([recipeId]);
    }

    public static async remove(id: string): Promise<void> {
        const { data: entries } = await supabase
            .from('meal_plan_entries')
            .select('id')
            .eq('recipe_id', id);

        if (entries?.length) {
            const { data: recipe } = await supabase
                .from('recipes')
                .select('name')
                .eq('id', id)
                .single();
            const recipeName = recipe?.name ?? 'Deleted recipe';
            await Promise.all(
                entries.map((entry) =>
                    supabase
                        .from('meal_plan_entries')
                        .update({ recipe_id: null, free_text: recipeName })
                        .eq('id', entry.id)
                )
            );
        }

        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
        await supabase.storage.from('recipe-images').remove([id]);
    }

    public static async upsertRecipeIngredients(
        recipeId: string,
        items: { ingredient_id: string; quantity: number }[]
    ): Promise<void> {
        const { error: delError } = await supabase
            .from('recipe_ingredients')
            .delete()
            .eq('recipe_id', recipeId);
        if (delError) throw delError;

        if (!items.length) return;

        const rows = items.map((i) => ({ ...i, recipe_id: recipeId }));
        const { error } = await supabase.from('recipe_ingredients').insert(rows);
        if (error) throw error;
    }
}
