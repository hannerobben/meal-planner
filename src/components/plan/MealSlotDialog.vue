<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import type { AppUserContract } from '../../model/user.contract.ts';
import type { IngredientContract } from '../../model/ingredient.contract.ts';
import { MEAL_TYPE_COLORS } from '../../model/type-colors.ts';

const props = defineProps<{
    visible: boolean;
    slotEntries: MealPlanEntryContract[];
    date: string;
    recipes: RecipeContract[];
    householdUsers: AppUserContract[];
    ingredients: IngredientContract[];
    initialMealType?: MealType;
}>();

export type AddonIngredientLine = { ingredientId: string; quantity: number };
export type UserEntry = {
    userId: string | null;
    recipeId: string | null;
    freeText: string | null;
    addonIngredients: AddonIngredientLine[];
};

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [mealType: MealType | null, userEntries: UserEntry[]];
    remove: [];
}>();

type DraftAddonLine = { ingredientId: string | null; quantity: number };
const addonLines = ref<DraftAddonLine[]>([]);
const perUserAddonLines = ref<Record<string, DraftAddonLine[]>>({});

const selectedRecipeId = ref<string | null>(null);
const originalRecipeId = ref<string | null>(null);
const definePerUser = ref(false);
const perUserRecipeIds = ref<Record<string, string | null>>({});
const originalPerUserRecipeIds = ref<Record<string, string | null>>({});
const showRecipeViewer = ref(false);
const viewingRecipeId = ref<string | null>(null);
const portions = ref(1);

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
        perUserRecipeIds.value = Object.fromEntries(props.householdUsers.map((u) => [u.id, null]));
        const isPerUser = props.slotEntries.some((e) => e.user_id !== null);
        if (isPerUser) {
            definePerUser.value = true;
            for (const e of props.slotEntries) {
                if (e.user_id) perUserRecipeIds.value[e.user_id] = e.recipe_id;
            }
            selectedRecipeId.value = null;
            originalRecipeId.value = null;
        } else {
            definePerUser.value = false;
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
    }
);

watch(definePerUser, (perUser) => {
    if (!perUser) return;
    // When toggling on from a shared entry, seed each user with the shared values
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
});

const recipeOptions = computed(() => {
    const existingIds = new Set(props.slotEntries.map((e) => e.recipe_id).filter(Boolean));
    return props.recipes
        .filter(
            (r) =>
                r.type.includes(displayMealType.value) &&
                (!r.not_suggested || existingIds.has(r.id))
        )
        .map((r) => ({ label: r.name, value: r.id }));
});

const ingredientOptions = computed(() =>
    props.ingredients.map((i) => ({ label: i.name, value: i.id }))
);

function ingredientUnit(ingredientId: string | null): string {
    if (!ingredientId) return '';
    return props.ingredients.find((i) => i.id === ingredientId)?.base_unit ?? '';
}

function addAddonLine(userId?: string) {
    if (userId) {
        (perUserAddonLines.value[userId] ??= []).push({ ingredientId: null, quantity: 0 });
    } else {
        addonLines.value.push({ ingredientId: null, quantity: 0 });
    }
}

function removeAddonLine(index: number, userId?: string) {
    if (userId) {
        perUserAddonLines.value[userId]?.splice(index, 1);
    } else {
        addonLines.value.splice(index, 1);
    }
}

function toAddonIngredients(lines: DraftAddonLine[]): AddonIngredientLine[] {
    return lines
        .filter((l) => l.ingredientId !== null && l.quantity > 0)
        .map((l) => ({ ingredientId: l.ingredientId!, quantity: l.quantity }));
}

const canSave = computed(() => {
    if (definePerUser.value) {
        return props.householdUsers.some((u) => !!perUserRecipeIds.value[u.id]);
    }
    return !!selectedRecipeId.value;
});

function openRecipeViewer(recipeId: string | null) {
    if (!recipeId) return;
    viewingRecipeId.value = recipeId;
    portions.value = 1;
    emit('update:visible', false);
    showRecipeViewer.value = true;
}

function handleSave() {
    const mealType = props.slotEntries.length > 0 ? null : displayMealType.value;
    let userEntries: UserEntry[];

    if (definePerUser.value) {
        userEntries = props.householdUsers
            .filter((u) => !!perUserRecipeIds.value[u.id])
            .map((u) => ({
                userId: u.id,
                recipeId: perUserRecipeIds.value[u.id] ?? null,
                freeText: null,
                addonIngredients: toAddonIngredients(perUserAddonLines.value[u.id] ?? [])
            }));
    } else {
        userEntries = [
            {
                userId: null,
                recipeId: selectedRecipeId.value,
                freeText: null,
                addonIngredients: toAddonIngredients(addonLines.value)
            }
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

            <!-- Single mode -->
            <template v-if="!definePerUser">
                <div class="recipe-row">
                    <Select
                        v-model="selectedRecipeId"
                        :options="recipeOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Choose a recipe…"
                        filter
                        style="flex: 1; min-width: 0"
                    />
                    <Button
                        v-if="selectedRecipeId && selectedRecipeId === originalRecipeId"
                        icon="pi pi-book"
                        severity="secondary"
                        @click="openRecipeViewer(selectedRecipeId)"
                    />
                </div>
                <div class="addon-section">
                    <div class="addon-title">Add-ons</div>
                    <div v-for="(line, i) in addonLines" :key="i" class="addon-row">
                        <Select
                            v-model="line.ingredientId"
                            :options="ingredientOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Ingredient…"
                            filter
                            class="addon-ingredient-select"
                        />
                        <InputNumber
                            v-model="line.quantity"
                            :min="0"
                            :maxFractionDigits="1"
                            placeholder="0"
                            class="addon-qty"
                        />
                        <span class="addon-unit">{{ ingredientUnit(line.ingredientId) }}</span>
                        <Button
                            icon="pi pi-times"
                            text
                            severity="secondary"
                            size="small"
                            @click="removeAddonLine(i)"
                        />
                    </div>
                    <button class="add-ingredient-link" @click="addAddonLine()">
                        + Add ingredient
                    </button>
                </div>
            </template>

            <!-- Per-user mode -->
            <template v-else>
                <div v-for="user in householdUsers" :key="user.id" class="user-form">
                    <div class="user-form-name">{{ user.display_name }}</div>
                    <div class="recipe-row">
                        <Select
                            v-model="perUserRecipeIds[user.id]"
                            :options="recipeOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choose a recipe…"
                            filter
                            style="flex: 1; min-width: 0"
                        />
                        <Button
                            v-if="
                                perUserRecipeIds[user.id] &&
                                perUserRecipeIds[user.id] === originalPerUserRecipeIds[user.id]
                            "
                            icon="pi pi-book"
                            severity="secondary"
                            @click="openRecipeViewer(perUserRecipeIds[user.id])"
                        />
                    </div>
                    <div class="addon-section">
                        <div class="addon-title">Add-ons</div>
                        <div
                            v-for="(line, i) in perUserAddonLines[user.id] ?? []"
                            :key="i"
                            class="addon-row"
                        >
                            <Select
                                v-model="line.ingredientId"
                                :options="ingredientOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Ingredient…"
                                filter
                                class="addon-ingredient-select"
                            />
                            <InputNumber
                                v-model="line.quantity"
                                :min="0"
                                placeholder="0"
                                class="addon-qty"
                            />
                            <span class="addon-unit">{{ ingredientUnit(line.ingredientId) }}</span>
                            <Button
                                icon="pi pi-times"
                                text
                                severity="secondary"
                                size="small"
                                @click="removeAddonLine(i, user.id)"
                            />
                        </div>
                        <button class="add-ingredient-link" @click="addAddonLine(user.id)">
                            + Add ingredient
                        </button>
                    </div>
                </div>
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

    <Dialog
        v-model:visible="showRecipeViewer"
        :header="viewingRecipe?.name"
        modal
        style="width: 340px"
    >
        <div class="recipe-viewer">
            <div
                v-if="viewingRecipe?.image_url"
                class="recipe-image"
                :style="{ backgroundImage: `url(${viewingRecipe.image_url})` }"
            />

            <div class="portion-control">
                <span class="portion-label">Portions</span>
                <div class="portion-stepper">
                    <button class="portion-btn" :disabled="portions <= 1" @click="portions--">
                        −
                    </button>
                    <span class="portion-value">{{ portions }}</span>
                    <button class="portion-btn" @click="portions++">+</button>
                </div>
            </div>

            <div v-if="viewingRecipe?.ingredients?.length" class="ingredient-list">
                <div v-for="ri in viewingRecipe.ingredients" :key="ri.id" class="ingredient-row">
                    <span class="ingredient-name">{{ ri.ingredient?.name }}</span>
                    <span class="ingredient-qty">
                        {{ ri.quantity * portions
                        }}{{ ri.ingredient?.base_unit !== 'item' ? ri.ingredient?.base_unit : '' }}
                    </span>
                </div>
            </div>
            <p v-else class="no-ingredients">No ingredients listed.</p>

            <template v-if="viewingRecipe?.notes">
                <p class="recipe-notes">{{ viewingRecipe.notes }}</p>
            </template>
        </div>
    </Dialog>
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

.dialog-body :deep(.p-select-label) {
    padding-top: 6px;
    padding-bottom: 6px;
}

.recipe-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.addon-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid lightgray;
    border-radius: 8px;
}

.addon-title {
    font-size: 0.75em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.addon-row {
    display: grid;
    grid-template-columns: 1fr 68px 28px 28px;
    gap: 6px;
    align-items: center;
}

.addon-ingredient-select {
    min-width: 0;
}

.addon-qty :deep(.p-inputnumber),
.addon-qty :deep(.p-inputnumber-input) {
    width: 100%;
    min-width: 0;
}

.addon-unit {
    font-size: 0.8em;
    color: #888;
    white-space: nowrap;
}

.add-ingredient-link {
    background: none;
    border: none;
    padding: 6px 0;
    color: #2e7d32;
    font-size: 0.85em;
    cursor: pointer;
    align-self: flex-start;

    &:hover {
        text-decoration: underline;
    }
}

.recipe-viewer {
    padding: 4px 0 8px;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.recipe-image {
    width: 100%;
    height: 160px;
    background-size: cover;
    background-position: center;
    border-radius: 6px;
    margin-bottom: 12px;
}

.portion-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0 4px;
}

.portion-label {
    font-size: 0.85em;
    color: #555;
}

.portion-stepper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.portion-btn {
    width: 26px;
    height: 26px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 1em;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #333;

    &:hover:not(:disabled) {
        background: #f0f0f0;
    }

    &:disabled {
        opacity: 0.35;
        cursor: default;
    }
}

.portion-value {
    font-size: 0.9em;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
}

.ingredient-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ingredient-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9em;
}

.ingredient-name {
    color: #333;
}

.ingredient-qty {
    color: #666;
    font-variant-numeric: tabular-nums;
}

.no-ingredients {
    color: #888;
    font-size: 0.9em;
    margin: 0;
}

.recipe-notes {
    font-size: 0.85em;
    color: #555;
    white-space: pre-wrap;
    margin: 0;
}
</style>
