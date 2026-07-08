<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { usePlanStore } from '../stores/plan.store.ts';
import { useRecipeStore } from '../stores/recipe.store.ts';
import WeekGrid from '../components/plan/WeekGrid.vue';
import MealSlotDialog from '../components/plan/MealSlotDialog.vue';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import dayjs from 'dayjs';

const planStore = usePlanStore();
const toast = useToast();
const recipeStore = useRecipeStore();
const { entries, weekStart, loading } = storeToRefs(planStore);
const { recipes } = storeToRefs(recipeStore);

const dialogVisible = ref(false);
const dialogDate = ref('');
const dialogEntry = ref<MealPlanEntryContract | undefined>(undefined);

onMounted(async () => {
    await Promise.all([planStore.fetchWeek(), recipeStore.fetchAll()]);
});

function openNew(date: string) {
    dialogDate.value = date;
    dialogEntry.value = undefined;
    dialogVisible.value = true;
}

function openEntry(date: string, entry: MealPlanEntryContract) {
    dialogDate.value = date;
    dialogEntry.value = entry;
    dialogVisible.value = true;
}

async function handleSave(mealType: MealType | null, recipeId: string | null, freeText: string | null) {
    try {
        if (mealType) {
            await planStore.insertEntry(dialogDate.value, mealType, recipeId, freeText);
        } else if (dialogEntry.value) {
            await planStore.updateEntry(dialogEntry.value.id, recipeId, freeText);
        }
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

async function handleRemove() {
    if (!dialogEntry.value) return;
    try {
        await planStore.removeEntry(dialogEntry.value.id);
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Remove failed', detail: String(e), life: 4000 });
    }
}

const weekLabel = () => {
    const start = dayjs(weekStart.value);
    const end = start.add(6, 'day');
    return `${start.format('D MMM')} – ${end.format('D MMM YYYY')}`;
};

function getDates(): string[] {
    return Array.from({ length: 7 }, (_, i) =>
        dayjs(weekStart.value).add(i, 'day').format('YYYY-MM-DD')
    );
}

function macrosForDate(date: string) {
    const dayEntries = entries.value.filter((e) => e.date === date);
    return dayEntries.reduce(
        (acc, e) => {
            const ings = e.recipe?.ingredients ?? [];
            for (const ri of ings) {
                if (!ri.ingredient) continue;
                const f = ri.quantity / 100;
                acc.kcal += f * ri.ingredient.calories_per_100;
                acc.protein += f * ri.ingredient.protein_g_per_100;
                acc.carbs += f * ri.ingredient.carbs_g_per_100;
                acc.fat += f * ri.ingredient.fat_g_per_100;
            }
            return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
}
</script>

<template>
    <div class="plan-page">
        <div class="plan-header">
            <Button icon="pi pi-chevron-left" text @click="planStore.prevWeek()" />
            <span class="week-label">{{ weekLabel() }}</span>
            <Button icon="pi pi-chevron-right" text @click="planStore.nextWeek()" />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <WeekGrid
            v-else
            :weekStart="weekStart"
            :entries="entries"
            @slotClick="(date, entry) => openEntry(date, entry)"
            @addClick="(date) => openNew(date)"
        />
        <div v-if="!loading" class="macro-row">
            <div v-for="date in getDates()" :key="date" class="macro-cell">
                <template v-if="macrosForDate(date).kcal">
                    <span class="m-kcal"
                        >{{ Math.round(macrosForDate(date).kcal) }}<em>kcal</em></span
                    >
                    <span class="m-protein"
                        >{{ Math.round(macrosForDate(date).protein) }}<em>P</em></span
                    >
                    <span class="m-carbs"
                        >{{ Math.round(macrosForDate(date).carbs) }}<em>C</em></span
                    >
                    <span class="m-fat">{{ Math.round(macrosForDate(date).fat) }}<em>F</em></span>
                </template>
            </div>
        </div>

        <MealSlotDialog
            v-model:visible="dialogVisible"
            :entry="dialogEntry"
            :date="dialogDate"
            :recipes="recipes"
            @save="handleSave"
            @remove="handleRemove"
        />
    </div>
</template>

<style scoped>
.plan-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    box-sizing: border-box;
}

.plan-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.week-label {
    font-weight: 600;
}

.loading {
    text-align: center;
    color: #888;
    padding: 40px 0;
}

.macro-row {
    display: flex;
    gap: 10px;
    padding: 0 12px;
}

.macro-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: white;
    border-radius: 8px;
    padding: 6px 4px;
    min-height: 20px;

    span {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1.1;
        font-size: 0.72em;
        font-weight: 600;
        width: 100%;
        flex: 1;
        justify-content: center;
        border-radius: 5px;
        padding: 6px 2px;

        em {
            font-style: normal;
            font-weight: 400;
            font-size: 0.8em;
            opacity: 0.7;
        }
    }

    .m-kcal {
        color: #2e7d32;
        background: #e8f5e9;
    }
    .m-protein {
        color: #1565c0;
        background: #e3f2fd;
    }
    .m-carbs {
        color: #e65100;
        background: #fbe9e7;
    }
    .m-fat {
        color: #f9a825;
        background: #fff8e1;
    }
}
</style>
