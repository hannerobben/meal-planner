<script setup lang="ts">
import type { IngredientContract } from '../../model/ingredient.contract.ts';
import { ingredientUnit as _ingredientUnit } from '../../utils/ingredient-unit.ts';

export type ExtraRecipeLine = { recipeId: string | null };
export type ExtraIngredientLine = { ingredientId: string | null; quantity: number };

const recipeLines = defineModel<ExtraRecipeLine[]>('recipeLines', { required: true });
const ingredientLines = defineModel<ExtraIngredientLine[]>('ingredientLines', { required: true });

const props = defineProps<{
    recipeOptions: { label: string; value: string }[];
    ingredientOptions: { label: string; value: string }[];
    ingredients: IngredientContract[];
}>();

function ingredientUnit(ingredientId: string | null): string {
    return _ingredientUnit(ingredientId, props.ingredients);
}

function addRecipeLine() {
    recipeLines.value = [...recipeLines.value, { recipeId: null }];
}

function removeRecipeLine(i: number) {
    recipeLines.value = recipeLines.value.filter((_, idx) => idx !== i);
}

function addIngredientLine() {
    ingredientLines.value = [...ingredientLines.value, { ingredientId: null, quantity: 0 }];
}

function removeIngredientLine(i: number) {
    ingredientLines.value = ingredientLines.value.filter((_, idx) => idx !== i);
}
</script>

<template>
    <div class="extra-form">
        <div class="extra-section">
            <div class="extra-section-label">Meals</div>
            <div v-for="(line, i) in recipeLines" :key="i" class="extra-recipe-row">
                <Select
                    v-model="line.recipeId"
                    :options="recipeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Recipe…"
                    filter
                    style="flex: 1; min-width: 0"
                />
                <Button
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    size="small"
                    @click="removeRecipeLine(i)"
                />
            </div>
            <button class="extra-add-link" @click="addRecipeLine">+ Add meal</button>
        </div>

        <div class="extra-section">
            <div class="extra-section-label">Ingredients</div>
            <div v-for="(line, i) in ingredientLines" :key="i" class="extra-ingredient-row">
                <Select
                    v-model="line.ingredientId"
                    :options="ingredientOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Ingredient…"
                    filter
                    class="extra-ingredient-select"
                />
                <InputNumber
                    v-model="line.quantity"
                    :min="0"
                    :maxFractionDigits="1"
                    placeholder="0"
                    class="extra-qty"
                />
                <span class="extra-unit">{{ ingredientUnit(line.ingredientId) }}</span>
                <Button
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    size="small"
                    @click="removeIngredientLine(i)"
                />
            </div>
            <button class="extra-add-link" @click="addIngredientLine">+ Add ingredient</button>
        </div>
    </div>
</template>

<style scoped>
.extra-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.extra-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid lightgray;
    border-radius: 8px;
}

.extra-section-label {
    font-size: 0.75em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.extra-recipe-row {
    display: grid;
    grid-template-columns: 1fr 28px;
    gap: 6px;
    align-items: center;
}

.extra-ingredient-row {
    display: grid;
    grid-template-columns: 1fr 68px 28px 28px;
    gap: 6px;
    align-items: center;
}

.extra-ingredient-select {
    min-width: 0;
}

.extra-qty :deep(.p-inputnumber),
.extra-qty :deep(.p-inputnumber-input) {
    width: 100%;
    min-width: 0;
}

.extra-unit {
    font-size: 0.8em;
    color: #888;
    white-space: nowrap;
}

.extra-add-link {
    background: none;
    border: none;
    padding: 6px 0;
    color: #c62828;
    font-size: 0.85em;
    cursor: pointer;
    align-self: flex-start;

    &:hover {
        text-decoration: underline;
    }
}
</style>
