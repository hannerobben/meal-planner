import { defineStore } from 'pinia';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import { PlanApi } from '../supabase/plan.api.ts';
import { useAuthStore } from './auth.store.ts';
import { currentWeekStart } from '../utils/week.ts';
import dayjs from 'dayjs';

function toIso(d: dayjs.Dayjs) {
    return d.format('YYYY-MM-DD');
}

export const usePlanStore = defineStore('plan-store', {
    state: (): {
        entries: MealPlanEntryContract[];
        weekStart: string;
        loading: boolean;
    } => ({
        entries: [],
        weekStart: currentWeekStart(useAuthStore().firstWeekDay),
        loading: false,
    }),
    getters: {
        weekEnd: (state): string => toIso(dayjs(state.weekStart).add(6, 'day')),
    },
    actions: {
        async fetchWeek() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            try {
                this.entries = await PlanApi.getForRange(householdId, this.weekStart, this.weekEnd);
            } finally {
                this.loading = false;
            }
        },
        prevWeek() {
            this.weekStart = toIso(dayjs(this.weekStart).subtract(7, 'day'));
            this.fetchWeek();
        },
        nextWeek() {
            this.weekStart = toIso(dayjs(this.weekStart).add(7, 'day'));
            this.fetchWeek();
        },
        async insertEntry(date: string, mealType: MealType, slotIndex: number, recipeId: string | null, freeText: string | null, userId: string | null = null): Promise<MealPlanEntryContract | undefined> {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            const entry = await PlanApi.insert(householdId, date, mealType, slotIndex, recipeId, freeText, userId);
            this.entries.push(entry);
            return entry;
        },
        async updateEntry(id: string, recipeId: string | null, freeText: string | null, userId: string | null = null) {
            await PlanApi.update(id, recipeId, freeText, userId);
            await this.fetchWeek();
        },
        async removeEntry(id: string) {
            await PlanApi.remove(id);
            this.entries = this.entries.filter((e) => e.id !== id);
        },
    },
});
