<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRecipeStore } from '../stores/recipe.store.ts';
import RecipeCard from '../components/recipe/RecipeCard.vue';
import { MEAL_TYPES, type MealType } from '../model/meal-plan-entry.contract.ts';
import { MEAL_TYPE_COLORS } from '../model/type-colors.ts';

const router = useRouter();
const recipeStore = useRecipeStore();
const { recipes, loading } = storeToRefs(recipeStore);

type SortKey = 'name' | 'calories' | 'protein' | 'carbs' | 'fat';

const sortOptions: { label: string; value: SortKey }[] = [
    { label: 'Name', value: 'name' },
    { label: 'kcal', value: 'calories' },
    { label: 'Protein', value: 'protein' },
    { label: 'Carbs', value: 'carbs' },
    { label: 'Fat', value: 'fat' }
];

const search = ref('');
const selectedType = ref<MealType | null>(null);
const sortKey = ref<SortKey>('name');
const sortAsc = ref(true);

function recipeValue(r: (typeof recipes.value)[0], key: SortKey): string | number {
    if (key === 'name') return r.name;
    const ings = r.ingredients ?? [];
    return ings.reduce((sum, ri) => {
        if (!ri.ingredient) return sum;
        const f = ri.quantity / 100;
        if (key === 'calories') return sum + ri.ingredient.calories_per_100 * f;
        if (key === 'protein') return sum + ri.ingredient.protein_g_per_100 * f;
        if (key === 'carbs') return sum + ri.ingredient.carbs_g_per_100 * f;
        return sum + ri.ingredient.fat_g_per_100 * f;
    }, 0);
}

const filtered = computed(() =>
    recipes.value
        .filter((r) => r.name.toLowerCase().includes(search.value.toLowerCase()))
        .filter((r) => !selectedType.value || r.type === selectedType.value)
        .sort((a, b) => {
            const av = recipeValue(a, sortKey.value);
            const bv = recipeValue(b, sortKey.value);
            const cmp =
                typeof av === 'string'
                    ? av.localeCompare(bv as string)
                    : (av as number) - (bv as number);
            return sortAsc.value ? cmp : -cmp;
        })
);

onMounted(() => recipeStore.fetchAll());
</script>

<template>
    <div class="recipes-page">
        <div class="header">
            <h2>Recipes</h2>
            <Button
                icon="pi pi-plus"
                label="New"
                @click="router.push({ name: 'RecipeDetail', params: { id: 'new' } })"
            />
        </div>

        <div class="sort-bar">
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="search" placeholder="Search…" />
            </IconField>
            <div class="sort-controls">
                <Select
                    v-model="sortKey"
                    :options="sortOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Sort by…"
                    size="small"
                />
                <Button
                    :icon="sortAsc ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down'"
                    text
                    severity="secondary"
                    @click="sortAsc = !sortAsc"
                    class="sort-dir-btn"
                />
            </div>
        </div>

        <div class="type-chips">
            <span
                v-for="t in MEAL_TYPES"
                :key="t"
                class="type-chip"
                :class="{ active: selectedType === t }"
                :style="{ backgroundColor: MEAL_TYPE_COLORS[t] }"
                @click="selectedType = selectedType === t ? null : t"
                >{{ t }}</span
            >
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <div v-else-if="!filtered.length" class="empty">No recipes yet. Tap + to create one.</div>
        <div v-else class="recipe-list">
            <RecipeCard
                v-for="recipe in filtered"
                :key="recipe.id"
                :recipe="recipe"
                @select="router.push({ name: 'RecipeDetail', params: { id: recipe.id } })"
            />
        </div>
    </div>
</template>

<style scoped>
.recipes-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    height: 100%;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
        margin: 0;
    }
}

.recipe-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    min-height: 0;
}

.sort-bar {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;

    :deep(.p-iconfield) {
        flex: 1;
        min-width: 0;
    }
    :deep(.p-iconfield .p-inputtext) {
        width: 100%;
        min-width: 0;
    }
    :deep(.p-inputtext) {
        max-width: 180px;
    }
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
}

.sort-dir-btn {
    background: white;
}

.type-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.type-chip {
    text-transform: capitalize;
    padding: 4px 12px;
    border-radius: 30px;
    font-size: 0.78em;
    cursor: pointer;
    background-color: #e0e0e0;
    border: 2px solid transparent;
    user-select: none;

    &.active {
        border-color: #555;
    }
}

.empty {
    color: #999;
    font-size: 0.9em;
    padding: 20px 0;
    text-align: center;
}
</style>
