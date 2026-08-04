<script setup lang="ts">
import type { IngredientContract } from '../../model/ingredient.contract.ts';

export type DraftAddonLine = { ingredientId: string | null; quantity: number };
export type DraftAddonRecipeLine = { recipeId: string | null };

const recipeId = defineModel<string | null>('recipeId', { required: true });
const addonLines = defineModel<DraftAddonLine[]>('addonLines', { required: true });
const addonRecipeLines = defineModel<DraftAddonRecipeLine[]>('addonRecipeLines', { required: true });

const props = defineProps<{
    originalRecipeId: string | null;
    recipeOptions: { label: string; value: string }[];
    addonRecipeOptions: { label: string; value: string }[];
    ingredientOptions: { label: string; value: string }[];
    ingredients: IngredientContract[];
}>();

const emit = defineEmits<{
    openRecipeViewer: [recipeId: string];
}>();

function ingredientUnit(ingredientId: string | null): string {
    if (!ingredientId) return '';
    return props.ingredients.find((i) => i.id === ingredientId)?.base_unit ?? '';
}

function addAddonLine() {
    addonLines.value = [...addonLines.value, { ingredientId: null, quantity: 0 }];
}

function removeAddonLine(index: number) {
    addonLines.value = addonLines.value.filter((_, i) => i !== index);
}

function addAddonRecipeLine() {
    addonRecipeLines.value = [...addonRecipeLines.value, { recipeId: null }];
}

function removeAddonRecipeLine(index: number) {
    addonRecipeLines.value = addonRecipeLines.value.filter((_, i) => i !== index);
}
</script>

<template>
    <div class="recipe-row">
        <Select
            v-model="recipeId"
            :options="recipeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Choose a recipe…"
            filter
            style="flex: 1; min-width: 0"
        />
        <Button
            v-if="recipeId && recipeId === originalRecipeId"
            icon="pi pi-book"
            severity="secondary"
            @click="emit('openRecipeViewer', recipeId)"
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
        <button class="add-ingredient-link" @click="addAddonLine()">+ Add ingredient</button>
        <hr class="addon-divider" />
        <div v-for="(line, i) in addonRecipeLines" :key="i" class="addon-recipe-row">
            <Select
                v-model="line.recipeId"
                :options="addonRecipeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Recipe…"
                filter
                class="addon-ingredient-select"
            />
            <Button
                icon="pi pi-times"
                text
                severity="secondary"
                size="small"
                @click="removeAddonRecipeLine(i)"
            />
        </div>
        <button class="add-ingredient-link" @click="addAddonRecipeLine()">+ Add recipe</button>
    </div>
</template>

<style scoped>
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

.addon-divider {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 4px 0;
}

.addon-recipe-row {
    display: grid;
    grid-template-columns: 1fr 28px;
    gap: 6px;
    align-items: center;
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
</style>
