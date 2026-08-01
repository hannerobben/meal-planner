import { supabase } from './supabase.ts';

export class HouseholdApi {
    public static async getSettings(householdId: string): Promise<{ first_week_day: number }> {
        const { data, error } = await supabase
            .from('households')
            .select('first_week_day')
            .eq('id', householdId)
            .single();

        if (error) throw error;
        return data;
    }
}
