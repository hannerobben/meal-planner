<script setup lang="ts">
import type { RecipeContract } from '../../model/recipe.contract.ts';
import { computed } from 'vue';
import { MEAL_TYPE_COLORS } from '../../model/type-colors.ts';

const props = defineProps<{ recipe: RecipeContract }>();
const emit = defineEmits<{ select: [] }>();

const totals = computed(() =>
    (props.recipe.ingredients ?? []).reduce(
        (acc, ri) => {
            if (!ri.ingredient) return acc;
            const f = ri.quantity / 100;
            return {
                calories: acc.calories + ri.ingredient.calories_per_100 * f,
                protein_g: acc.protein_g + ri.ingredient.protein_g_per_100 * f,
                carbs_g: acc.carbs_g + ri.ingredient.carbs_g_per_100 * f,
                fat_g: acc.fat_g + ri.ingredient.fat_g_per_100 * f
            };
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    )
);
</script>

<template>
    <div
        class="recipe-card"
        :class="{ 'has-image': recipe.image_url }"
        :style="recipe.image_url ? { backgroundImage: `url(${recipe.image_url})` } : {}"
        @click="emit('select')"
    >
        <div class="top">
            <span class="recipe-name">{{ recipe.name }}</span>
            <span class="type-badge" :style="{ backgroundColor: MEAL_TYPE_COLORS[recipe.type] }">{{ recipe.type }}</span>
        </div>
        <div class="display-row">
            <div class="meta">
                <span class="meta-item">
                    <span>kcal</span>
                    <span>{{ Math.round(totals.calories) }}</span>
                </span>
                <span class="meta-item">
                    <span>P</span>
                    <span>{{ Math.round(totals.protein_g * 10) / 10 }}g</span>
                </span>
                <span class="meta-item">
                    <span>C</span>
                    <span>{{ Math.round(totals.carbs_g * 10) / 10 }}g</span>
                </span>
                <span class="meta-item">
                    <span>F</span>
                    <span>{{ Math.round(totals.fat_g * 10) / 10 }}g</span>
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.recipe-card {
    background: white;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 20px;
    min-height: fit-content;

    &:hover {
        background: #f9f9f9;
    }

    &.has-image {
        background-size: cover;
        background-position: center;

        &:hover {
            background-color: transparent;
        }

        &::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgb(0 0 0 / 86%) 0%, #00000052 65%);
            pointer-events: none;
        }

        .recipe-name {
            color: white;
        }
        .meta-item {
            color: rgba(255, 255, 255, 0.8);
        }
    }
}

.top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.display-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
}

.recipe-name {
    font-weight: 500;
    position: relative;
    z-index: 1;
}

.type-badge {
    text-transform: capitalize;
    padding: 2px 10px;
    border-radius: 30px;
    font-size: 0.6em;
    position: relative;
    z-index: 1;
}

.meta {
    display: flex;
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
}
</style>
