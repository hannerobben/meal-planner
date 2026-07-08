import { defineStore } from 'pinia';
import type { RecipeContract } from '../model/recipe.contract.ts';
import { RecipeApi } from '../supabase/recipe.api.ts';
import { useAuthStore } from './auth.store.ts';
import { usePlanStore } from './plan.store.ts';
import { useShoppingStore } from './shopping.store.ts';

export const useRecipeStore = defineStore('recipe-store', {
    state: (): {
        recipes: RecipeContract[];
        currentRecipe: RecipeContract | undefined;
        loading: boolean;
    } => ({ recipes: [], currentRecipe: undefined, loading: false }),
    actions: {
        async fetchAll() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            try {
                this.recipes = await RecipeApi.getAll(householdId);
            } finally {
                this.loading = false;
            }
        },
        async fetchById(id: string) {
            this.loading = true;
            try {
                this.currentRecipe = await RecipeApi.getById(id);
            } finally {
                this.loading = false;
            }
        },
        async removeRecipe(id: string) {
            await RecipeApi.remove(id);
            this.recipes = this.recipes.filter((r) => r.id !== id);
            // invalidate caches in other stores
            usePlanStore().entries = [];
            useShoppingStore().items = [];
        }
    }
});
