import { supabase } from './supabase.ts';
import type { AppUserContract } from '../model/user.contract.ts';
import type { User } from '@supabase/supabase-js';

export class AuthApi {
    public static async getAuthUser(): Promise<User | null> {
        const { data } = await supabase.auth.getSession();
        return data.session?.user || null;
    }

    public static async getAppUser(authUserId: string): Promise<AppUserContract | undefined> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUserId)
            .single();

        if (error) return undefined;
        return data ?? undefined;
    }

    public static async updateDisplayName(userId: string, displayName: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ display_name: displayName })
            .eq('id', userId);

        if (error) throw error;
    }

    public static async updateNutritionProfile(
        userId: string,
        profile: {
            weight_kg: number | null;
            height_cm: number | null;
            age: number | null;
            sex: 'male' | 'female' | null;
            activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'super_active' | null;
            protein_per_kg: number | null;
            fat_loss_goal: 'maintenance' | 'mild_loss' | 'moderate_loss' | null;
        }
    ): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update(profile)
            .eq('id', userId);

        if (error) throw error;
    }
}
