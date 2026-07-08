<script setup lang="ts">
import type { IngredientContract } from '../../model/ingredient.contract.ts';

export interface RecipeIngredientRowData {
    _key: string;
    ingredient_id: string;
    ingredient: IngredientContract | null;
    quantity: number;
}

defineProps<{ modelValue: RecipeIngredientRowData }>();
const emit = defineEmits<{
    'update:modelValue': [value: RecipeIngredientRowData];
    remove: [];
    quantityBlur: [];
}>();
</script>

<template>
    <div class="recipe-ingredient-row">
        <span class="ingredient-name">{{ modelValue.ingredient?.name ?? '—' }}</span>
        <InputNumber
            :modelValue="modelValue.quantity"
            @update:modelValue="emit('update:modelValue', { ...modelValue, quantity: $event ?? 0 })"
            @blur="emit('quantityBlur')"
            placeholder="0"
            :min="0"
            fluid
        />
        <span class="unit-label">{{ modelValue.ingredient?.base_unit ?? '' }}</span>
        <Button icon="pi pi-trash" text severity="danger" @click="emit('remove')" />
    </div>
</template>

<style scoped>
.recipe-ingredient-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 100px) 3rem 2.5rem;
    gap: 6px;
    align-items: center;
}

.recipe-ingredient-row :deep(.p-inputnumber),
.recipe-ingredient-row :deep(.p-inputnumber-input) {
    width: 100%;
    min-width: 0;
}

.ingredient-name {
    font-size: 0.95em;
    padding: 8px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.unit-label {
    font-size: 0.8em;
    color: #888;
    white-space: nowrap;
}
</style>
