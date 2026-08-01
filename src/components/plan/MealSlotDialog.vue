<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import { MEAL_TYPE_COLORS } from '../../model/type-colors.ts';
import Divider from 'primevue/divider';

const props = defineProps<{
    visible: boolean;
    entry: MealPlanEntryContract | undefined;
    date: string;
    recipes: RecipeContract[];
    initialMealType?: MealType;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [mealType: MealType | null, recipeId: string | null, freeText: string | null];
    remove: [];
}>();

const selectedRecipeId = ref<string | null>(null);
const showRecipeViewer = ref(false);
const portions = ref(1);

const displayMealType = computed(
    () => props.entry?.meal_type ?? props.initialMealType ?? 'breakfast'
);

const selectedRecipe = computed<RecipeContract | undefined>(() =>
    selectedRecipeId.value ? props.recipes.find((r) => r.id === selectedRecipeId.value) : undefined
);

watch(
    () => props.visible,
    (v) => {
        if (!v) return;
        selectedRecipeId.value = props.entry?.recipe_id ?? null;
    }
);

const recipeOptions = computed(() =>
    props.recipes
        .filter((r) => r.type.includes(displayMealType.value))
        .map((r) => ({ label: r.name, value: r.id }))
);

const canSave = computed(() => !!selectedRecipeId.value);

function openRecipeViewer() {
    portions.value = 1;
    emit('update:visible', false);
    showRecipeViewer.value = true;
}

function handleSave() {
    const mealType = props.entry ? null : displayMealType.value;
    emit('save', mealType, selectedRecipeId.value, null);
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
            <span
                class="type-badge"
                :style="{ backgroundColor: MEAL_TYPE_COLORS[displayMealType] }"
                >{{ displayMealType }}</span
            >

            <Select
                v-model="selectedRecipeId"
                :options="recipeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose a recipe…"
                filter
                style="width: 100%"
            />

            <template v-if="selectedRecipe">
                <Button
                    label="Show Recipe"
                    severity="secondary"
                    style="width: 100%"
                    @click="openRecipeViewer"
                />
                <Divider />
            </template>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button
                    v-if="entry"
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
        :header="selectedRecipe?.name"
        modal
        style="width: 340px"
    >
        <div class="recipe-viewer">
            <div
                v-if="selectedRecipe?.image_url"
                class="recipe-image"
                :style="{ backgroundImage: `url(${selectedRecipe.image_url})` }"
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

            <Divider />

            <div v-if="selectedRecipe?.ingredients?.length" class="ingredient-list">
                <div v-for="ri in selectedRecipe.ingredients" :key="ri.id" class="ingredient-row">
                    <span class="ingredient-name">{{ ri.ingredient?.name }}</span>
                    <span class="ingredient-qty">
                        {{ ri.quantity * portions }}{{ ri.ingredient?.base_unit !== 'item' ? ri.ingredient?.base_unit : '' }}
                    </span>
                </div>
            </div>
            <p v-else class="no-ingredients">No ingredients listed.</p>

            <template v-if="selectedRecipe?.notes">
                <Divider />
                <p class="recipe-notes">{{ selectedRecipe.notes }}</p>
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

.type-badge {
    text-transform: capitalize;
    padding: 2px 10px;
    border-radius: 30px;
    font-size: 0.6em;
    align-self: flex-start;
}

.dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
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
