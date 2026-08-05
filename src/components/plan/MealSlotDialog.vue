<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import type { AppUserContract } from '../../model/user.contract.ts';
import type { IngredientContract } from '../../model/ingredient.contract.ts';
import { MEAL_TYPE_COLORS } from '../../model/type-colors.ts';
import MealSlotEntryForm from './MealSlotEntryForm.vue';
import type { DraftAddonLine, DraftAddonRecipeLine } from './MealSlotEntryForm.vue';
import ExtraSlotForm from './ExtraSlotForm.vue';
import RecipeViewerDialog from './RecipeViewerDialog.vue';

const props = defineProps<{
    visible: boolean;
    slotEntries: MealPlanEntryContract[];
    date: string;
    recipes: RecipeContract[];
    householdUsers: AppUserContract[];
    ingredients: IngredientContract[];
    initialMealType?: MealType;
    selfUserId?: string;
}>();

export type AddonIngredientLine = { ingredientId: string; quantity: number };
export type UserEntry = {
    userId: string | null;
    recipeId: string | null;
    freeText: string | null;
    addonIngredients: AddonIngredientLine[];
    addonRecipes: string[];
};

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [mealType: MealType | null, userEntries: UserEntry[]];
    remove: [];
}>();

let _dialogInitializing = false;
const addonLines = ref<DraftAddonLine[]>([]);
const perUserAddonLines = ref<Record<string, DraftAddonLine[]>>({});

const addonRecipeLines = ref<DraftAddonRecipeLine[]>([]);
const perUserAddonRecipeLines = ref<Record<string, DraftAddonRecipeLine[]>>({});

const selectedRecipeId = ref<string | null>(null);
const originalRecipeId = ref<string | null>(null);
const definePerUser = ref(false);
const perUserRecipeIds = ref<Record<string, string | null>>({});
const originalPerUserRecipeIds = ref<Record<string, string | null>>({});
const showRecipeViewer = ref(false);
const viewingRecipeId = ref<string | null>(null);

const displayMealType = computed(
    () => props.slotEntries[0]?.meal_type ?? props.initialMealType ?? 'breakfast'
);

const viewingRecipe = computed<RecipeContract | undefined>(() =>
    viewingRecipeId.value ? props.recipes.find((r) => r.id === viewingRecipeId.value) : undefined
);

watch(
    () => props.visible,
    (v) => {
        if (!v) return;
        _dialogInitializing = true;
        perUserRecipeIds.value = Object.fromEntries(props.householdUsers.map((u) => [u.id, null]));
        const isPerUser = !props.selfUserId && props.slotEntries.some((e) => e.user_id !== null);
        if (isPerUser) {
            definePerUser.value = true;
            for (const e of props.slotEntries) {
                if (e.user_id) perUserRecipeIds.value[e.user_id] = e.recipe_id;
            }
            selectedRecipeId.value = null;
            originalRecipeId.value = null;
        } else {
            definePerUser.value = !props.selfUserId && props.slotEntries.length === 0 && displayMealType.value === 'extra';
            selectedRecipeId.value = props.slotEntries[0]?.recipe_id ?? null;
            originalRecipeId.value = props.slotEntries[0]?.recipe_id ?? null;
        }
        originalPerUserRecipeIds.value = { ...perUserRecipeIds.value };
        addonLines.value = (props.slotEntries[0]?.addon_ingredients ?? []).map((a) => ({
            ingredientId: a.ingredient_id,
            quantity: a.quantity
        }));
        perUserAddonLines.value = Object.fromEntries(
            props.householdUsers.map((u) => {
                const entry = props.slotEntries.find((e) => e.user_id === u.id);
                return [
                    u.id,
                    (entry?.addon_ingredients ?? []).map((a) => ({
                        ingredientId: a.ingredient_id,
                        quantity: a.quantity
                    }))
                ];
            })
        );
        addonRecipeLines.value = (props.slotEntries[0]?.addon_recipes ?? []).map((ar) => ({
            recipeId: ar.recipe_id
        }));
        perUserAddonRecipeLines.value = Object.fromEntries(
            props.householdUsers.map((u) => {
                const entry = props.slotEntries.find((e) => e.user_id === u.id);
                return [u.id, (entry?.addon_recipes ?? []).map((ar) => ({ recipeId: ar.recipe_id }))];
            })
        );
        nextTick(() => { _dialogInitializing = false; });
    }
);

watch(definePerUser, (perUser) => {
    if (!perUser || _dialogInitializing) return;
    if (selectedRecipeId.value) {
        for (const u of props.householdUsers) {
            perUserRecipeIds.value[u.id] = selectedRecipeId.value;
        }
    }
    if (addonLines.value.length) {
        for (const u of props.householdUsers) {
            perUserAddonLines.value[u.id] = addonLines.value.map((l) => ({ ...l }));
        }
    }
    if (addonRecipeLines.value.length) {
        for (const u of props.householdUsers) {
            perUserAddonRecipeLines.value[u.id] = addonRecipeLines.value.map((l) => ({ ...l }));
        }
    }
});

const recipeOptions = computed(() => {
    const existingIds = new Set(props.slotEntries.map((e) => e.recipe_id).filter(Boolean));
    return props.recipes
        .filter(
            (r) =>
                !r.is_addon &&
                r.type.includes(displayMealType.value) &&
                (!r.not_suggested || existingIds.has(r.id))
        )
        .map((r) => ({ label: r.name, value: r.id }));
});

const ingredientOptions = computed(() =>
    props.ingredients.map((i) => ({ label: i.name, value: i.id }))
);

const addonRecipeOptions = computed(() =>
    props.recipes
        .filter((r) => r.is_addon && r.type.includes(displayMealType.value))
        .map((r) => ({ label: r.name, value: r.id }))
);

const extraRecipeOptions = computed(() =>
    props.recipes.map((r) => ({ label: r.name, value: r.id }))
);

function toAddonRecipes(lines: DraftAddonRecipeLine[]): string[] {
    return lines.filter((l) => l.recipeId !== null).map((l) => l.recipeId!);
}

function toAddonIngredients(lines: DraftAddonLine[]): AddonIngredientLine[] {
    return lines
        .filter((l) => l.ingredientId !== null && l.quantity > 0)
        .map((l) => ({ ingredientId: l.ingredientId!, quantity: l.quantity }));
}

const canSave = computed(() => {
    if (displayMealType.value === 'extra') {
        const hasItem = (recipes: DraftAddonRecipeLine[], ingredients: DraftAddonLine[]) =>
            recipes.some((l) => l.recipeId !== null) ||
            ingredients.some((l) => l.ingredientId !== null && l.quantity > 0);
        if (definePerUser.value) {
            return props.householdUsers.some((u) =>
                hasItem(
                    perUserAddonRecipeLines.value[u.id] ?? [],
                    perUserAddonLines.value[u.id] ?? []
                )
            );
        }
        return hasItem(addonRecipeLines.value, addonLines.value);
    }
    if (definePerUser.value) {
        return props.householdUsers.some((u) => !!perUserRecipeIds.value[u.id]);
    }
    return !!selectedRecipeId.value;
});

function onRecipeCleared() {
    addonLines.value = [];
    addonRecipeLines.value = [];
}

function onPerUserRecipeCleared(userId: string) {
    perUserAddonLines.value[userId] = [];
    perUserAddonRecipeLines.value[userId] = [];
}

function openRecipeViewer(recipeId: string) {
    viewingRecipeId.value = recipeId;
    emit('update:visible', false);
    showRecipeViewer.value = true;
}

function handleSave() {
    const mealType = props.slotEntries.length > 0 ? null : displayMealType.value;
    let userEntries: UserEntry[];

    if (displayMealType.value === 'extra') {
        if (definePerUser.value) {
            userEntries = props.householdUsers
                .filter((u) => {
                    const recipes = perUserAddonRecipeLines.value[u.id] ?? [];
                    const ingredients = perUserAddonLines.value[u.id] ?? [];
                    return (
                        recipes.some((l) => l.recipeId !== null) ||
                        ingredients.some((l) => l.ingredientId !== null && l.quantity > 0)
                    );
                })
                .map((u) => ({
                    userId: u.id,
                    recipeId: null,
                    freeText: null,
                    addonIngredients: toAddonIngredients(perUserAddonLines.value[u.id] ?? []),
                    addonRecipes: toAddonRecipes(perUserAddonRecipeLines.value[u.id] ?? []),
                }));
        } else {
            userEntries = [
                {
                    userId: props.selfUserId ?? null,
                    recipeId: null,
                    freeText: null,
                    addonIngredients: toAddonIngredients(addonLines.value),
                    addonRecipes: toAddonRecipes(addonRecipeLines.value),
                },
            ];
        }
    } else if (definePerUser.value) {
        userEntries = props.householdUsers
            .filter((u) => !!perUserRecipeIds.value[u.id])
            .map((u) => ({
                userId: u.id,
                recipeId: perUserRecipeIds.value[u.id] ?? null,
                freeText: null,
                addonIngredients: toAddonIngredients(perUserAddonLines.value[u.id] ?? []),
                addonRecipes: toAddonRecipes(perUserAddonRecipeLines.value[u.id] ?? []),
            }));
    } else {
        userEntries = [
            {
                userId: props.selfUserId ?? null,
                recipeId: selectedRecipeId.value,
                freeText: null,
                addonIngredients: toAddonIngredients(addonLines.value),
                addonRecipes: toAddonRecipes(addonRecipeLines.value),
            },
        ];
    }

    emit('save', mealType, userEntries);
    emit('update:visible', false);
}

const title = computed(() =>
    new Date(props.date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    })
);
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="$emit('update:visible', $event)"
        :header="title"
        modal
        style="width: 340px"
    >
        <div class="dialog-body">
            <div class="type-row">
                <span
                    class="type-badge"
                    :style="{ backgroundColor: MEAL_TYPE_COLORS[displayMealType] }"
                    >{{ displayMealType }}</span
                >
                <div v-if="householdUsers.length > 1" class="per-user-toggle">
                    <ToggleSwitch v-model="definePerUser" inputId="per-user-toggle" />
                    <label for="per-user-toggle">Define per user</label>
                </div>
            </div>

            <!-- Extra slot mode -->
            <template v-if="displayMealType === 'extra'">
                <template v-if="!definePerUser">
                    <ExtraSlotForm
                        v-model:recipeLines="addonRecipeLines"
                        v-model:ingredientLines="addonLines"
                        :recipeOptions="extraRecipeOptions"
                        :ingredientOptions="ingredientOptions"
                        :ingredients="ingredients"
                    />
                </template>
                <template v-else>
                    <div v-for="user in householdUsers" :key="user.id" class="user-form">
                        <div class="user-form-name">{{ user.display_name }}</div>
                        <ExtraSlotForm
                            v-model:recipeLines="perUserAddonRecipeLines[user.id]"
                            v-model:ingredientLines="perUserAddonLines[user.id]"
                            :recipeOptions="extraRecipeOptions"
                            :ingredientOptions="ingredientOptions"
                            :ingredients="ingredients"
                        />
                    </div>
                </template>
            </template>

            <!-- Regular slot mode -->
            <template v-else>
                <!-- Single mode -->
                <template v-if="!definePerUser">
                    <MealSlotEntryForm
                        v-model:recipeId="selectedRecipeId"
                        v-model:addonLines="addonLines"
                        v-model:addonRecipeLines="addonRecipeLines"
                        :originalRecipeId="originalRecipeId"
                        :recipeOptions="recipeOptions"
                        :addonRecipeOptions="addonRecipeOptions"
                        :ingredientOptions="ingredientOptions"
                        :ingredients="ingredients"
                        @update:recipeId="(v) => { if (v === null) onRecipeCleared(); }"
                        @openRecipeViewer="openRecipeViewer"
                    />
                </template>

                <!-- Per-user mode -->
                <template v-else>
                    <div v-for="user in householdUsers" :key="user.id" class="user-form">
                        <div class="user-form-name">{{ user.display_name }}</div>
                        <MealSlotEntryForm
                            v-model:recipeId="perUserRecipeIds[user.id]"
                            v-model:addonLines="perUserAddonLines[user.id]"
                            v-model:addonRecipeLines="perUserAddonRecipeLines[user.id]"
                            :originalRecipeId="originalPerUserRecipeIds[user.id]"
                            :recipeOptions="recipeOptions"
                            :addonRecipeOptions="addonRecipeOptions"
                            :ingredientOptions="ingredientOptions"
                            :ingredients="ingredients"
                            @update:recipeId="(v) => { if (v === null) onPerUserRecipeCleared(user.id); }"
                            @openRecipeViewer="openRecipeViewer"
                        />
                    </div>
                </template>
            </template>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button
                    v-if="slotEntries.length > 0"
                    label="Remove"
                    text
                    severity="danger"
                    @click="
                        emit('remove');
                        emit('update:visible', false);
                    "
                />
                <div style="flex: 1" />
                <Button
                    label="Cancel"
                    text
                    severity="secondary"
                    @click="$emit('update:visible', false)"
                />
                <Button label="Save" :disabled="!canSave" @click="handleSave" />
            </div>
        </template>
    </Dialog>

    <RecipeViewerDialog v-model:visible="showRecipeViewer" :recipe="viewingRecipe" />
</template>

<style scoped>
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 8px;
}

.type-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.per-user-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9em;

    label {
        cursor: pointer;
    }
}

.user-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.user-form-name {
    font-size: 0.85em;
    font-weight: 600;
    color: #555;
}

.type-badge {
    text-transform: capitalize;
    padding: 2px 10px;
    border-radius: 30px;
    font-size: 0.7em;
}

.dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

</style>
