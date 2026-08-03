import { supabase } from './supabase.ts';
import type { AppUserContract } from '../model/user.contract.ts';

export class HouseholdApi {
    public static async getUsers(householdId: string): Promise<AppUserContract[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('household_id', householdId);

        if (error) throw error;
        return data ?? [];
    }


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
