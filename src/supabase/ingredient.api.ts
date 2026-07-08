import { supabase } from './supabase.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';

export type IngredientInput = Omit<IngredientContract, 'id' | 'household_id'>;

export class IngredientApi {
    public static async getAll(householdId: string): Promise<IngredientContract[]> {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .eq('household_id', householdId)
            .order('name');
        if (error) throw error;
        return data ?? [];
    }

    public static async create(householdId: string, input: IngredientInput): Promise<IngredientContract> {
        const { data, error } = await supabase
            .from('ingredients')
            .insert({ ...input, household_id: householdId })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    public static async update(id: string, input: IngredientInput): Promise<void> {
        const { error } = await supabase
            .from('ingredients')
            .update(input)
            .eq('id', id);
        if (error) throw error;
    }

    public static async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('ingredients')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
