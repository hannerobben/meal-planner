<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { usePlanStore } from '../stores/plan.store.ts';
import { useRecipeStore } from '../stores/recipe.store.ts';
import { useAuthStore } from '../stores/auth.store.ts';
import { useIngredientStore } from '../stores/ingredient.store.ts';
import { PlanApi } from '../supabase/plan.api.ts';
import { HouseholdApi } from '../supabase/household.api.ts';
import WeekGrid from '../components/plan/WeekGrid.vue';
import MealSlotDialog from '../components/plan/MealSlotDialog.vue';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import type { AppUserContract } from '../model/user.contract.ts';
import type { UserEntry } from '../components/plan/MealSlotDialog.vue';
import {
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    ActivityLevel,
    FatLossGoal
} from '../utils/nutrition.ts';
import { ingredientFactor } from '../utils/recipe-macros.ts';
import dayjs from 'dayjs';

const planStore = usePlanStore();
const toast = useToast();
const recipeStore = useRecipeStore();
const authStore = useAuthStore();
const ingredientStore = useIngredientStore();
const { entries, weekStart, loading } = storeToRefs(planStore);
const { recipes } = storeToRefs(recipeStore);
const { ingredients } = storeToRefs(ingredientStore);
const { appUser } = storeToRefs(authStore);

const householdUsers = ref<AppUserContract[]>([]);

const selfEntries = computed(() =>
    entries.value.filter((e) => e.user_id === appUser.value?.id || e.user_id === null)
);

const targetMacros = computed(() => {
    const u = appUser.value;
    if (!u?.weight_kg || !u?.height_cm || !u?.age || !u?.sex || !u?.activity_level) return null;
    const bmr = calculateBMR({
        weight_kg: u.weight_kg,
        height_cm: u.height_cm,
        age: u.age,
        sex: u.sex
    });
    const tdee = calculateTDEE(bmr, u.activity_level as ActivityLevel);
    return {
        tdee,
        ...calculateMacros({
            tdee,
            weight_kg: u.weight_kg,
            protein_per_kg: u.protein_per_kg ?? undefined,
            fat_loss_goal: (u.fat_loss_goal as FatLossGoal) ?? undefined
        })
    };
});

function trafficLight(actual: number, target: number | undefined, lo: number, hi: number): string {
    if (!target) return '';
    const ratio = actual / target;
    if (ratio >= lo && ratio <= hi) return 'tl-green';
    if (ratio >= 2 * lo - 1 && ratio <= 2 * hi - 1) return 'tl-orange';
    return 'tl-red';
}

function caret(actual: number, target: number | undefined): string {
    if (!target || !actual) return '';
    return actual > target ? '▲' : '▼';
}

const dialogVisible = ref(false);
const dialogDate = ref('');
const dialogSlotEntries = ref<MealPlanEntryContract[]>([]);
const dialogInitialMealType = ref<MealType>('breakfast');
const dialogSlotIndex = ref(0);

onMounted(async () => {
    const householdId = authStore.householdId;
    await Promise.all([
        planStore.fetchWeek(),
        recipeStore.fetchAll(),
        ingredientStore.fetchAll(),
        householdId
            ? HouseholdApi.getUsers(householdId).then((u) => {
                  householdUsers.value = u;
              })
            : Promise.resolve()
    ]);
});

function openNew(date: string, mealType: MealType, slotIndex: number) {
    dialogDate.value = date;
    dialogSlotEntries.value = [];
    dialogInitialMealType.value = mealType;
    dialogSlotIndex.value = slotIndex;
    dialogVisible.value = true;
}

function openEntry(date: string, slotEntries: MealPlanEntryContract[]) {
    dialogDate.value = date;
    dialogSlotEntries.value = slotEntries;
    dialogVisible.value = true;
}

async function handleSave(mealType: MealType | null, userEntries: UserEntry[]) {
    try {
        const ue = userEntries[0];
        if (!ue) return;

        if (mealType) {
            const e = await planStore.insertEntry(
                dialogDate.value,
                mealType,
                dialogSlotIndex.value,
                ue.recipeId,
                ue.freeText,
                ue.userId
            );
            if (e) {
                await Promise.all([
                    PlanApi.replaceAddonIngredients(e.id, ue.addonIngredients),
                    PlanApi.replaceAddonRecipes(e.id, ue.addonRecipes)
                ]);
            }
        } else {
            const match = dialogSlotEntries.value[0];
            if (match) {
                if (match.user_id === null) {
                    // Shared entry: remove it, create personal version for self,
                    // and create a copy of the original for each other household user.
                    await planStore.removeEntry(match.id);
                    const selfEntry = await planStore.insertEntry(
                        match.date,
                        match.meal_type,
                        match.slot_index,
                        ue.recipeId,
                        ue.freeText,
                        ue.userId
                    );
                    if (selfEntry) {
                        await Promise.all([
                            PlanApi.replaceAddonIngredients(selfEntry.id, ue.addonIngredients),
                            PlanApi.replaceAddonRecipes(selfEntry.id, ue.addonRecipes)
                        ]);
                    }
                    const otherUsers = householdUsers.value.filter(
                        (u) => u.id !== appUser.value?.id
                    );
                    await Promise.all(
                        otherUsers.map(async (u) => {
                            const copy = await planStore.insertEntry(
                                match.date,
                                match.meal_type,
                                match.slot_index,
                                match.recipe_id,
                                match.free_text,
                                u.id
                            );
                            if (copy) {
                                await Promise.all([
                                    PlanApi.replaceAddonIngredients(
                                        copy.id,
                                        (match.addon_ingredients ?? []).map((a) => ({
                                            ingredientId: a.ingredient_id,
                                            quantity: a.quantity
                                        }))
                                    ),
                                    PlanApi.replaceAddonRecipes(
                                        copy.id,
                                        (match.addon_recipes ?? []).map((ar) => ar.recipe_id)
                                    )
                                ]);
                            }
                        })
                    );
                } else {
                    await planStore.updateEntry(match.id, ue.recipeId, ue.freeText, ue.userId);
                    await Promise.all([
                        PlanApi.replaceAddonIngredients(match.id, ue.addonIngredients),
                        PlanApi.replaceAddonRecipes(match.id, ue.addonRecipes)
                    ]);
                }
            }
        }
        await planStore.fetchWeek();
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

async function handleRemove() {
    if (!dialogSlotEntries.value.length) return;
    try {
        await Promise.all(dialogSlotEntries.value.map((e) => planStore.removeEntry(e.id)));
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
    const dayEntries = selfEntries.value.filter((e) => e.date === date);
    return dayEntries.reduce(
        (acc, e) => {
            for (const ri of e.recipe?.ingredients ?? []) {
                if (!ri.ingredient) continue;
                const f = ingredientFactor(ri.quantity, ri.ingredient);
                acc.kcal += f * ri.ingredient.calories_per_100;
                acc.protein += f * ri.ingredient.protein_g_per_100;
                acc.carbs += f * ri.ingredient.carbs_g_per_100;
                acc.fat += f * ri.ingredient.fat_g_per_100;
            }
            for (const ai of e.addon_ingredients ?? []) {
                if (!ai.ingredient) continue;
                const f = ingredientFactor(ai.quantity, ai.ingredient);
                acc.kcal += f * ai.ingredient.calories_per_100;
                acc.protein += f * ai.ingredient.protein_g_per_100;
                acc.carbs += f * ai.ingredient.carbs_g_per_100;
                acc.fat += f * ai.ingredient.fat_g_per_100;
            }
            for (const ar of e.addon_recipes ?? []) {
                for (const ri of ar.recipe?.ingredients ?? []) {
                    if (!ri.ingredient) continue;
                    const f = ingredientFactor(ri.quantity, ri.ingredient);
                    acc.kcal += f * ri.ingredient.calories_per_100;
                    acc.protein += f * ri.ingredient.protein_g_per_100;
                    acc.carbs += f * ri.ingredient.carbs_g_per_100;
                    acc.fat += f * ri.ingredient.fat_g_per_100;
                }
            }
            return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
}
</script>

<template>
    <div class="tracking-page">
        <h2 class="page-title">{{ appUser?.display_name }}'s Tracker</h2>
        <div class="plan-header">
            <Button icon="pi pi-chevron-left" text @click="planStore.prevWeek()" />
            <span class="week-label">{{ weekLabel() }}</span>
            <Button icon="pi pi-chevron-right" text @click="planStore.nextWeek()" />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <WeekGrid
            v-else
            :weekStart="weekStart"
            :entries="selfEntries"
            :householdUserIds="appUser ? [appUser.id] : []"
            @slotClick="(date, slotEntries) => openEntry(date, slotEntries)"
            @addClick="(date, mealType, slotIndex) => openNew(date, mealType, slotIndex)"
        />

        <div v-if="!loading" class="macro-row">
            <div v-for="date in getDates()" :key="date" class="macro-cell">
                <span
                    :class="
                        macrosForDate(date).kcal
                            ? [
                                  'm-kcal',
                                  trafficLight(
                                      macrosForDate(date).kcal,
                                      targetMacros?.target_kcal,
                                      0.95,
                                      1.05
                                  )
                              ]
                            : 'm-empty'
                    "
                    >{{ Math.round(macrosForDate(date).kcal) }}<em>kcal</em
                    ><em class="caret">{{
                        caret(macrosForDate(date).kcal, targetMacros?.target_kcal)
                    }}</em></span
                >
                <span
                    :class="
                        macrosForDate(date).kcal
                            ? [
                                  'm-protein',
                                  trafficLight(
                                      macrosForDate(date).protein,
                                      targetMacros?.protein_g,
                                      0.9,
                                      1.2
                                  )
                              ]
                            : 'm-empty'
                    "
                    >{{ Math.round(macrosForDate(date).protein) }}<em>P</em
                    ><em class="caret">{{
                        caret(macrosForDate(date).protein, targetMacros?.protein_g)
                    }}</em></span
                >
                <span
                    :class="
                        macrosForDate(date).kcal
                            ? [
                                  'm-carbs',
                                  trafficLight(
                                      macrosForDate(date).carbs,
                                      targetMacros?.carbs_g,
                                      0.85,
                                      1.15
                                  )
                              ]
                            : 'm-empty'
                    "
                    >{{ Math.round(macrosForDate(date).carbs) }}<em>C</em
                    ><em class="caret">{{
                        caret(macrosForDate(date).carbs, targetMacros?.carbs_g)
                    }}</em></span
                >
                <span
                    :class="
                        macrosForDate(date).kcal
                            ? [
                                  'm-fat',
                                  trafficLight(
                                      macrosForDate(date).fat,
                                      targetMacros?.fat_g,
                                      0.85,
                                      1.15
                                  )
                              ]
                            : 'm-empty'
                    "
                    >{{ Math.round(macrosForDate(date).fat) }}<em>F</em
                    ><em class="caret">{{
                        caret(macrosForDate(date).fat, targetMacros?.fat_g)
                    }}</em></span
                >
            </div>
        </div>

        <MealSlotDialog
            v-model:visible="dialogVisible"
            :slotEntries="dialogSlotEntries"
            :date="dialogDate"
            :recipes="recipes"
            :householdUsers="[]"
            :ingredients="ingredients"
            :initialMealType="dialogInitialMealType"
            :selfUserId="appUser?.id"
            @save="handleSave"
            @remove="handleRemove"
        />
    </div>
</template>

<style scoped>
.tracking-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
}

.page-title {
    margin: 0;
    font-size: 0.85em;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
}

.plan-header {
    display: flex;
    align-items: center;
    border-radius: 8px;
}

.week-label {
    font-weight: 600;
    flex: 1;
    text-align: center;
    font-size: 14px;
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
    margin-top: 12px;
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
        font-size: 0.52em;
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

        em.caret {
            font-size: 0.65em;
            line-height: 1;
            opacity: 0.85;
            margin-top: 2px;
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
