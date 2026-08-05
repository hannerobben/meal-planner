<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RecipeContract } from '../../model/recipe.contract.ts';

const props = defineProps<{
    visible: boolean;
    recipe: RecipeContract | undefined;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
}>();

const portions = ref(1);

watch(
    () => props.visible,
    (v) => { if (v) portions.value = 1; }
);
</script>

<template>
    <Dialog
        :visible="visible"
        @update:visible="emit('update:visible', $event)"
        :header="recipe?.name"
        modal
        style="width: 340px"
    >
        <div class="recipe-viewer">
            <div
                v-if="recipe?.image_url"
                class="recipe-image"
                :style="{ backgroundImage: `url(${recipe.image_url})` }"
            />

            <div class="portion-control">
                <span class="portion-label">Portions</span>
                <div class="portion-stepper">
                    <button class="portion-btn" :disabled="portions <= 1" @click="portions--">−</button>
                    <span class="portion-value">{{ portions }}</span>
                    <button class="portion-btn" @click="portions++">+</button>
                </div>
            </div>

            <div v-if="recipe?.ingredients?.length" class="ingredient-list">
                <div v-for="ri in recipe.ingredients" :key="ri.id" class="ingredient-row">
                    <span class="ingredient-name">{{ ri.ingredient?.name }}</span>
                    <span class="ingredient-qty">
                        {{ ri.quantity * portions }}{{ ri.ingredient?.base_unit !== 'item' ? ri.ingredient?.base_unit : '' }}
                    </span>
                </div>
            </div>
            <p v-else class="no-ingredients">No ingredients listed.</p>

            <p v-if="recipe?.notes" class="recipe-notes">{{ recipe.notes }}</p>
        </div>
    </Dialog>
</template>

<style scoped>
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
