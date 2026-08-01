import { defineStore } from 'pinia';
import type { AppUserContract } from '../model/user.contract.ts';
import type { User } from '@supabase/supabase-js';
import { AuthApi } from '../supabase/auth.api.ts';
import { HouseholdApi } from '../supabase/household.api.ts';

export const useAuthStore = defineStore('auth-store', {
    state: (): {
        authUser: User | null;
        appUser: AppUserContract | undefined;
        household: { first_week_day: number } | undefined;
    } => ({ authUser: null, appUser: undefined, household: undefined }),
    getters: {
        householdId: (state): string | undefined => state.appUser?.household_id,
        firstWeekDay: (state): number => state.household?.first_week_day ?? 1,
    },
    actions: {
        async getAuthUser() {
            this.authUser = await AuthApi.getAuthUser();
        },
        async getAppUser() {
            if (!this.authUser) return;
            this.appUser = await AuthApi.getAppUser(this.authUser.id);
        },
        async getAuthUserAndAppUser() {
            await this.getAuthUser();
            await this.getAppUser();
            if (this.householdId) {
                this.household = await HouseholdApi.getSettings(this.householdId);
            }
        },
        async clearUsers() {
            this.authUser = null;
            this.appUser = undefined;
            this.household = undefined;
        }
    }
});
