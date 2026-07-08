import { defineStore } from 'pinia';
import type { IngredientContract } from '../model/ingredient.contract.ts';
import { IngredientApi, type IngredientInput } from '../supabase/ingredient.api.ts';
import { useAuthStore } from './auth.store.ts';

export const useIngredientStore = defineStore('ingredient-store', {
    state: (): {
        ingredients: IngredientContract[];
        loading: boolean;
    } => ({ ingredients: [], loading: false }),
    actions: {
        async fetchAll() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            try {
                this.ingredients = await IngredientApi.getAll(householdId);
            } finally {
                this.loading = false;
            }
        },
        async create(input: IngredientInput): Promise<IngredientContract> {
            const householdId = useAuthStore().householdId!;
            const created = await IngredientApi.create(householdId, input);
            this.ingredients.push(created);
            this.ingredients.sort((a, b) => a.name.localeCompare(b.name));
            return created;
        },
        async update(id: string, input: IngredientInput): Promise<void> {
            await IngredientApi.update(id, input);
            const idx = this.ingredients.findIndex((i) => i.id === id);
            if (idx !== -1) {
                this.ingredients[idx] = { ...this.ingredients[idx], ...input };
                this.ingredients.sort((a, b) => a.name.localeCompare(b.name));
            }
        },
        async remove(id: string): Promise<void> {
            await IngredientApi.remove(id);
            this.ingredients = this.ingredients.filter((i) => i.id !== id);
        }
    }
});
