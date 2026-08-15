<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import DayColumn from './DayColumn.vue';
import { ingredientFactor } from '../../utils/recipe-macros.ts';
import dayjs from 'dayjs';

export type ViewMode = 'meals' | 'kcal' | 'protein';

const props = defineProps<{
    weekStart: string;
    entries: MealPlanEntryContract[];
    householdUserIds: string[];
    showViewSelector?: boolean;
}>();

const emit = defineEmits<{
    slotClick: [date: string, entries: MealPlanEntryContract[]];
    addClick: [date: string, mealType: MealType, slotIndex: number];
}>();

const viewMode = ref<ViewMode>('meals');
const viewOptions: { label: string; value: ViewMode }[] = [
    { label: 'Meals', value: 'meals' },
    { label: 'Kcal', value: 'kcal' },
    { label: 'Protein', value: 'protein' }
];

const globalMax = computed(() => {
    if (viewMode.value === 'meals') return 0;
    const slotGroups = new Map<string, MealPlanEntryContract[]>();
    for (const e of props.entries) {
        const key = `${e.date}|${e.meal_type}|${e.slot_index}`;
        const arr = slotGroups.get(key) ?? [];
        arr.push(e);
        slotGroups.set(key, arr);
    }
    let max = 0;
    for (const slotEntries of slotGroups.values()) {
        let val = 0;
        for (const e of slotEntries) {
            for (const ri of e.recipe?.ingredients ?? []) {
                if (!ri.ingredient) continue;
                const f = ingredientFactor(ri.quantity, ri.ingredient);
                val +=
                    f *
                    (viewMode.value === 'kcal'
                        ? ri.ingredient.calories_per_100
                        : ri.ingredient.protein_g_per_100);
            }
            for (const ai of e.addon_ingredients ?? []) {
                if (!ai.ingredient) continue;
                const f = ingredientFactor(ai.quantity, ai.ingredient);
                val +=
                    f *
                    (viewMode.value === 'kcal'
                        ? ai.ingredient.calories_per_100
                        : ai.ingredient.protein_g_per_100);
            }
            for (const ar of e.addon_recipes ?? []) {
                for (const ri of ar.recipe?.ingredients ?? []) {
                    if (!ri.ingredient) continue;
                    const f = ingredientFactor(ri.quantity, ri.ingredient);
                    val +=
                        f *
                        (viewMode.value === 'kcal'
                            ? ri.ingredient.calories_per_100
                            : ri.ingredient.protein_g_per_100);
                }
            }
        }
        if (val > max) max = val;
    }
    return max;
});

function getDates(): string[] {
    return Array.from({ length: 7 }, (_, i) =>
        dayjs(props.weekStart).add(i, 'day').format('YYYY-MM-DD')
    );
}

function entriesForDate(date: string) {
    return props.entries.filter((e) => e.date === date);
}
</script>

<template>
    <div class="week-grid-card">
        <div v-if="showViewSelector !== false" class="view-selector">
            <SelectButton
                v-model="viewMode"
                :options="viewOptions"
                optionLabel="label"
                optionValue="value"
                size="small"
            />
        </div>
        <div class="week-grid">
            <DayColumn
                v-for="date in getDates()"
                :key="date"
                :date="date"
                :entries="entriesForDate(date)"
                :householdUserIds="householdUserIds"
                :viewMode="viewMode"
                :globalMax="globalMax"
                @slotClick="(date, entries) => emit('slotClick', date, entries)"
                @addClick="
                    (date, mealType, slotIndex) => emit('addClick', date, mealType, slotIndex)
                "
            />
        </div>
    </div>
</template>

<style scoped lang="scss">
.week-grid-card {
    background: white;
    border-radius: 12px;
    padding: 8px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.view-selector {
    display: flex;
    justify-content: center;

    :deep(.p-selectbutton .p-togglebutton) {
        padding: 1px 4px;
        font-size: 0.65rem;
        min-width: 0;
    }
}

.week-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
}
</style>
