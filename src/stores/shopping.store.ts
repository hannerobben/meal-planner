import { defineStore } from 'pinia';
import type { IngredientCategory } from '../model/ingredient.contract.ts';
import { INGREDIENT_CATEGORIES } from '../model/ingredient.contract.ts';
import { ShoppingApi } from '../supabase/shopping.api.ts';
import { useAuthStore } from './auth.store.ts';
import dayjs from 'dayjs';

export interface AggregatedItem {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    checked: boolean;
}

export interface CategoryGroup {
    category: IngredientCategory;
    items: AggregatedItem[];
}

function toIso(d: dayjs.Dayjs) {
    return d.format('YYYY-MM-DD');
}

export const useShoppingStore = defineStore('shopping-store', {
    state: (): {
        from: string;
        to: string;
        items: AggregatedItem[];
        loading: boolean;
    } => ({
        from: toIso(dayjs().startOf('week').add(1, 'day')),
        to: toIso(dayjs().startOf('week').add(7, 'day')),
        items: [],
        loading: false
    }),
    getters: {
        categorizedList: (state): CategoryGroup[] => {
            return INGREDIENT_CATEGORIES
                .map((cat) => ({
                    category: cat,
                    items: state.items.filter((i) => i.category === cat)
                }))
                .filter((g) => g.items.length > 0);
        }
    },
    actions: {
        async fetchForRange() {
            const householdId = useAuthStore().householdId;
            if (!householdId) return;
            this.loading = true;
            try {
                const raw = await ShoppingApi.getIngredientsForRange(householdId, this.from, this.to);

                const map = new Map<string, AggregatedItem>();
                for (const item of raw) {
                    const { ingredient, quantity } = item;
                    const factor = quantity / 100;
                    const key = `${ingredient.name.toLowerCase()}|${ingredient.base_unit.toLowerCase()}|${ingredient.category}`;
                    const existing = map.get(key);
                    if (existing) {
                        existing.quantity += quantity;
                        existing.calories += ingredient.calories_per_100 * factor;
                        existing.protein_g += ingredient.protein_g_per_100 * factor;
                        existing.carbs_g += ingredient.carbs_g_per_100 * factor;
                        existing.fat_g += ingredient.fat_g_per_100 * factor;
                    } else {
                        map.set(key, {
                            name: ingredient.name,
                            quantity,
                            unit: ingredient.base_unit,
                            category: ingredient.category,
                            calories: ingredient.calories_per_100 * factor,
                            protein_g: ingredient.protein_g_per_100 * factor,
                            carbs_g: ingredient.carbs_g_per_100 * factor,
                            fat_g: ingredient.fat_g_per_100 * factor,
                            checked: false
                        });
                    }
                }
                this.items = Array.from(map.values());
            } finally {
                this.loading = false;
            }
        },
        toggleChecked(name: string, unit: string, category: IngredientCategory) {
            const item = this.items.find(
                (i) => i.name === name && i.unit === unit && i.category === category
            );
            if (item) item.checked = !item.checked;
        },
        setRange(from: string, to: string) {
            this.from = from;
            this.to = to;
            this.fetchForRange();
        }
    }
});
