<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { usePlanStore } from '../stores/plan.store.ts';
import { useRecipeStore } from '../stores/recipe.store.ts';
import { useAuthStore } from '../stores/auth.store.ts';
import { useIngredientStore } from '../stores/ingredient.store.ts';
import { HouseholdApi } from '../supabase/household.api.ts';
import { PlanApi } from '../supabase/plan.api.ts';
import WeekGrid from '../components/plan/WeekGrid.vue';
import MealSlotDialog from '../components/plan/MealSlotDialog.vue';
import type { MealPlanEntryContract, MealType } from '../model/meal-plan-entry.contract.ts';
import type { AppUserContract } from '../model/user.contract.ts';
import type { UserEntry, AddonIngredientLine } from '../components/plan/MealSlotDialog.vue';
import {
    calculateBMR,
    calculateTDEE,
    calculateMacros,
    ActivityLevel,
    FatLossGoal
} from '../utils/nutrition.ts';
import { ingredientFactor } from '../utils/recipe-macros.ts';
import { generateMealPlan } from '../utils/generate-meal-plan.ts';
import dayjs from 'dayjs';

const planStore = usePlanStore();
const toast = useToast();
const recipeStore = useRecipeStore();
const authStore = useAuthStore();
const ingredientStore = useIngredientStore();
const { entries, weekStart, loading } = storeToRefs(planStore);
const weekEnd = computed(() => dayjs(weekStart.value).add(6, 'day').format('YYYY-MM-DD'));
const { recipes } = storeToRefs(recipeStore);
const { ingredients } = storeToRefs(ingredientStore);
const { appUser } = storeToRefs(authStore);

const householdUsers = ref<AppUserContract[]>([]);
const selectedMacroUserId = ref<string | null>(null);

const selectedMacroUser = computed(
    () => householdUsers.value.find((u) => u.id === selectedMacroUserId.value) ?? appUser.value
);

const orderedHouseholdUserIds = computed(() =>
    [...householdUsers.value]
        .sort((a, b) => (a.id === appUser.value?.id ? -1 : b.id === appUser.value?.id ? 1 : 0))
        .map((u) => u.id)
);

const targetMacros = computed(() => {
    const u = selectedMacroUser.value;
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
                  selectedMacroUserId.value = appUser.value?.id ?? u[0]?.id ?? null;
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

function openEntry(date: string, entries: MealPlanEntryContract[]) {
    dialogDate.value = date;
    dialogSlotEntries.value = entries;
    dialogVisible.value = true;
}

async function handleSave(mealType: MealType | null, userEntries: UserEntry[]) {
    try {
        const existing = dialogSlotEntries.value;
        const entryAddonMap = new Map<string, AddonIngredientLine[]>();

        if (mealType) {
            const inserted = await Promise.all(
                userEntries.map((ue) =>
                    planStore.insertEntry(
                        dialogDate.value,
                        mealType,
                        dialogSlotIndex.value,
                        ue.recipeId,
                        ue.freeText,
                        ue.userId
                    )
                )
            );
            inserted.forEach((e, i) => { if (e) entryAddonMap.set(e.id, userEntries[i].addonIngredients); });
        } else if (existing.length > 0) {
            const byUser = new Map(existing.map((e) => [e.user_id, e]));
            const slotMealType = existing[0].meal_type;
            const slotIndex = existing[0].slot_index;
            await Promise.all(
                userEntries.map(async (ue) => {
                    const match = byUser.get(ue.userId);
                    byUser.delete(ue.userId);
                    if (match) {
                        entryAddonMap.set(match.id, ue.addonIngredients);
                        return planStore.updateEntry(match.id, ue.recipeId, ue.freeText, ue.userId);
                    } else {
                        const e = await planStore.insertEntry(
                            dialogDate.value,
                            slotMealType,
                            slotIndex,
                            ue.recipeId,
                            ue.freeText,
                            ue.userId
                        );
                        if (e) entryAddonMap.set(e.id, ue.addonIngredients);
                    }
                })
            );
            await Promise.all([...byUser.values()].map((e) => planStore.removeEntry(e.id)));
        }

        await Promise.all([...entryAddonMap.entries()].map(([id, lines]) => PlanApi.replaceAddonIngredients(id, lines)));
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

const generating = ref(false);
const generateConfirmVisible = ref(false);
const clearConfirmVisible = ref(false);

async function handleClear() {
    clearConfirmVisible.value = false;
    try {
        await Promise.all(entries.value.map((e) => planStore.removeEntry(e.id)));
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Clear failed', detail: String(e), life: 4000 });
    }
}

async function handleGenerate() {
    generateConfirmVisible.value = false;
    generating.value = true;
    try {
        await Promise.all(entries.value.map((e) => planStore.removeEntry(e.id)));
        const generated = generateMealPlan(
            weekStart.value,
            weekEnd.value,
            recipes.value,
            targetMacros.value ?? { target_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        );
        await Promise.all(
            generated.map((e) =>
                planStore.insertEntry(e.date, e.meal_type, e.slot_index, e.recipe_id, null)
            )
        );
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Generate failed', detail: String(e), life: 4000 });
    } finally {
        generating.value = false;
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
    const userId = selectedMacroUserId.value;
    const dayEntries = entries.value.filter(
        (e) => e.date === date && (e.user_id === null || e.user_id === userId)
    );
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

        <div class="plan-actions">
            <Button
                icon="pi pi-sparkles"
                size="small"
                outlined
                :loading="generating"
                @click="generateConfirmVisible = true"
            />
            <Button
                icon="pi pi-trash"
                size="small"
                outlined
                :disabled="!entries.length"
                @click="clearConfirmVisible = true"
            />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <WeekGrid
            v-else
            :weekStart="weekStart"
            :entries="entries"
            :householdUserIds="orderedHouseholdUserIds"
            @slotClick="(date, entries) => openEntry(date, entries)"
            @addClick="(date, mealType, slotIndex) => openNew(date, mealType, slotIndex)"
        />
        <div v-if="!loading && householdUsers.length > 1" class="macro-tabs">
            <button
                v-for="user in [...householdUsers].sort((a, b) =>
                    a.id === appUser?.id ? -1 : b.id === appUser?.id ? 1 : 0
                )"
                :key="user.id"
                class="macro-tab"
                :class="{ active: selectedMacroUserId === user.id }"
                @click="selectedMacroUserId = user.id"
            >
                {{ user.display_name }}
            </button>
        </div>

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
            :householdUsers="householdUsers"
            :ingredients="ingredients"
            :initialMealType="dialogInitialMealType"
            @save="handleSave"
            @remove="handleRemove"
        />

        <Dialog
            v-model:visible="generateConfirmVisible"
            header="Auto-fill week"
            modal
            style="width: min(320px, 92vw)"
        >
            <p style="margin: 0 0 4px">This will replace all meals for {{ weekLabel() }}.</p>
            <template #footer>
                <Button
                    label="Cancel"
                    text
                    severity="secondary"
                    @click="generateConfirmVisible = false"
                />
                <Button label="Auto-fill" icon="pi pi-sparkles" @click="handleGenerate" />
            </template>
        </Dialog>

        <Dialog
            v-model:visible="clearConfirmVisible"
            header="Clear week"
            modal
            style="width: min(320px, 92vw)"
        >
            <p style="margin: 0 0 4px">Remove all meals for {{ weekLabel() }}?</p>
            <template #footer>
                <Button
                    label="Cancel"
                    text
                    severity="secondary"
                    @click="clearConfirmVisible = false"
                />
                <Button label="Clear" icon="pi pi-trash" severity="danger" @click="handleClear" />
            </template>
        </Dialog>
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

.plan-actions {
    display: flex;
    gap: 8px;
    margin-top: -8px;
    margin-bottom: -8px;
}

.macro-tabs {
    display: flex;
    gap: 4px;
    margin: 0 12px;
    margin-bottom: -8px;
    border-bottom: 1px solid white;
}

.macro-tab {
    padding: 4px 14px;
    border: none;
    border-radius: 6px 6px 0 0;
    color: #555;
    font-size: 0.8em;
    cursor: pointer;

    &.active {
        background: white;
        color: #2e7d32;
        font-weight: 600;
    }
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
