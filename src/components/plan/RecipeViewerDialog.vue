<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import { sumMacros } from '../../utils/recipe-macros.ts';

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
    (v) => {
        if (v) portions.value = 1;
    }
);

const macros = computed(() => {
    const totals = sumMacros(props.recipe?.ingredients ?? []);
    return {
        calories: Math.round(totals.calories),
        protein_g: Math.round(totals.protein_g * 10) / 10,
        carbs_g: Math.round(totals.carbs_g * 10) / 10,
        fat_g: Math.round(totals.fat_g * 10) / 10
    };
});
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
            >
                <div class="meta meta--overlay">
                    <span class="meta-title">Per portion</span>
                    <div class="meta-items">
                        <span class="meta-item">
                            <span>kcal</span>
                            <span>{{ macros.calories }}</span>
                        </span>
                        <span class="meta-item">
                            <span>P</span>
                            <span>{{ macros.protein_g }}g</span>
                        </span>
                        <span class="meta-item">
                            <span>C</span>
                            <span>{{ macros.carbs_g }}g</span>
                        </span>
                        <span class="meta-item">
                            <span>F</span>
                            <span>{{ macros.fat_g }}g</span>
                        </span>
                    </div>
                </div>
            </div>

            <div v-else class="meta">
                <span class="meta-title">Per portion</span>
                <div class="meta-items">
                    <span class="meta-item">
                        <span>kcal</span>
                        <span>{{ macros.calories }}</span>
                    </span>
                    <span class="meta-item">
                        <span>P</span>
                        <span>{{ macros.protein_g }}g</span>
                    </span>
                    <span class="meta-item">
                        <span>C</span>
                        <span>{{ macros.carbs_g }}g</span>
                    </span>
                    <span class="meta-item">
                        <span>F</span>
                        <span>{{ macros.fat_g }}g</span>
                    </span>
                </div>
            </div>

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

            <div v-if="recipe?.ingredients?.length" class="ingredient-list">
                <div v-for="ri in recipe.ingredients" :key="ri.id" class="ingredient-row">
                    <span class="ingredient-name">{{ ri.ingredient?.name }}</span>
                    <span class="ingredient-qty">
                        {{ ri.quantity * portions
                        }}{{ ri.ingredient?.base_unit !== 'item' ? ri.ingredient?.base_unit : '' }}
                    </span>
                </div>
            </div>
            <p v-else class="no-ingredients">No ingredients listed.</p>

            <template v-if="recipe?.notes">
                <Divider />
                <p class="notes-title">Notes</p>
                <p class="recipe-notes">{{ recipe.notes }}</p>
            </template>
        </div>
    </Dialog>
</template>

<style scoped lang="scss">
.recipe-viewer {
    padding: 4px 0 8px;
    display: flex;
    flex-direction: column;
    gap: 0;
}

.recipe-image {
    width: 100%;
    height: 140px;
    background-size: cover;
    background-position: center;
    border-radius: 6px;
    margin-bottom: 12px;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgb(0 0 0 / 86%) 0%, #00000052 65%);
        pointer-events: none;
    }
}

.meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;

    &--overlay {
        position: absolute;
        bottom: 8px;
        left: 12px;
        margin-bottom: 0;

        .meta-title {
            color: rgba(255, 255, 255, 0.7);
        }

        .meta-item {
            color: rgba(255, 255, 255, 0.85);
            border-right-color: rgba(255, 255, 255, 0.25);
        }
    }
}

.meta-title {
    font-size: 0.7em;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.meta-items {
    display: flex;
    flex-direction: row;
    gap: 8px;
}

.meta-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.8em;
    color: #555;
    border-right: 1px solid #ededed;
    padding-right: 8px;
    position: relative;
    z-index: 1;

    &:last-child {
        border-right: none;
    }
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

.notes-title {
    font-size: 0.75em;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 4px;
}

.recipe-notes {
    font-size: 0.85em;
    color: #555;
    white-space: pre-wrap;
    margin: 0;
}
</style>
