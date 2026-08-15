<script setup lang="ts">
import type { MealPlanEntryContract } from '../../model/meal-plan-entry.contract.ts';
import type { ViewMode } from './WeekGrid.vue';

defineProps<{
    entry: MealPlanEntryContract;
    viewMode?: ViewMode;
    macroValue?: string;
    heatBackground?: string;
    heatTextColor?: string;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
    <div
        class="meal-slot"
        :style="
            viewMode === 'meals' && entry.recipe?.image_url
                ? {
                      backgroundImage: `url(${entry.recipe.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                  }
                : viewMode !== 'meals' && heatBackground
                ? { background: heatBackground, color: heatTextColor, borderColor: 'transparent' }
                : {}
        "
        @click="$emit('click')"
    >
        <span v-if="viewMode !== 'meals' && macroValue" class="macro-number">{{ macroValue }}</span>
        <span
            v-else-if="entry.addon_ingredients?.length || entry.addon_recipes?.length"
            class="addon-dot"
            >+</span
        >
    </div>
</template>

<style scoped>
.meal-slot {
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid #9bbd9d;
    background: #f1f8e9;
    cursor: pointer;
    min-height: 36px;
    position: relative;
}

.macro-number {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7em;
    font-weight: 600;
}

.addon-dot {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #9bbd9d;
    color: white;
    font-size: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
