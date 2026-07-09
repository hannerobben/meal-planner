<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { usePlanStore } from '../stores/plan.store.ts';
import { useRecipeStore } from '../stores/recipe.store.ts';
import { useAuthStore } from '../stores/auth.store.ts';
import WeekGrid from '../components/plan/WeekGrid.vue';
import MealSlotDialog from '../components/plan/MealSlotDialog.vue';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import { calculateBMR, calculateTDEE, calculateMacros, ActivityLevel, FatLossGoal } from '../utils/nutrition.ts';
import dayjs from 'dayjs';

const planStore = usePlanStore();
const toast = useToast();
const recipeStore = useRecipeStore();
const { entries, weekStart, loading } = storeToRefs(planStore);
const { recipes } = storeToRefs(recipeStore);
const { appUser } = storeToRefs(useAuthStore());

const targetMacros = computed(() => {
    const u = appUser.value;
    if (!u?.weight_kg || !u?.height_cm || !u?.age || !u?.sex || !u?.activity_level) return null;
    const bmr = calculateBMR({ weight_kg: u.weight_kg, height_cm: u.height_cm, age: u.age, sex: u.sex });
    const tdee = calculateTDEE(bmr, u.activity_level as ActivityLevel);
    return { tdee, ...calculateMacros({ tdee, weight_kg: u.weight_kg, protein_per_kg: u.protein_per_kg ?? undefined, fat_loss_goal: (u.fat_loss_goal as FatLossGoal) ?? undefined }) };
});

function trafficLight(actual: number, target: number | undefined, lo: number, hi: number): string {
    if (!target) return '';
    const ratio = actual / target;
    if (ratio >= lo && ratio <= hi) return 'tl-green';
    if (ratio >= 2 * lo - 1 && ratio <= 2 * hi - 1) return 'tl-orange';
    return 'tl-red';
}

const dialogVisible = ref(false);
const dialogDate = ref('');
const dialogEntry = ref<MealPlanEntryContract | undefined>(undefined);
const dialogInitialMealType = ref<MealType>('breakfast');

onMounted(async () => {
    await Promise.all([planStore.fetchWeek(), recipeStore.fetchAll()]);
});

function openNew(date: string, mealType: MealType) {
    dialogDate.value = date;
    dialogEntry.value = undefined;
    dialogInitialMealType.value = mealType;
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
            @addClick="(date, mealType) => openNew(date, mealType)"
        />
        <div v-if="!loading" class="macro-row">
            <div v-for="date in getDates()" :key="date" class="macro-cell">
                <span :class="macrosForDate(date).kcal ? ['m-kcal', trafficLight(macrosForDate(date).kcal, targetMacros?.target_kcal, 0.95, 1.05)] : 'm-empty'"
                    >{{ Math.round(macrosForDate(date).kcal) }}<em>kcal</em></span
                >
                <span :class="macrosForDate(date).kcal ? ['m-protein', trafficLight(macrosForDate(date).protein, targetMacros?.protein_g, 0.90, 1.20)] : 'm-empty'"
                    >{{ Math.round(macrosForDate(date).protein) }}<em>P</em></span
                >
                <span :class="macrosForDate(date).kcal ? ['m-carbs', trafficLight(macrosForDate(date).carbs, targetMacros?.carbs_g, 0.85, 1.15)] : 'm-empty'"
                    >{{ Math.round(macrosForDate(date).carbs) }}<em>C</em></span
                >
                <span :class="macrosForDate(date).kcal ? ['m-fat', trafficLight(macrosForDate(date).fat, targetMacros?.fat_g, 0.85, 1.15)] : 'm-empty'"
                    >{{ Math.round(macrosForDate(date).fat) }}<em>F</em></span
                >
            </div>
        </div>

        <MealSlotDialog
            v-model:visible="dialogVisible"
            :entry="dialogEntry"
            :date="dialogDate"
            :recipes="recipes"
            :initialMealType="dialogInitialMealType"
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

    .m-empty {
        color: #9e9e9e;
        background: #f5f5f5;
    }

    .tl-green {
        color: #2e7d32;
        background: #e8f5e9;
    }

    .tl-orange {
        color: #e65100;
        background: #fff3e0;
    }

    .tl-red {
        color: #c62828;
        background: #ffebee;
    }
}
</style>
