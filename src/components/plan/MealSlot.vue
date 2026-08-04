<script setup lang="ts">
import type { MealPlanEntryContract } from '../../model/meal-plan-entry.contract.ts';

defineProps<{ entry: MealPlanEntryContract }>();
defineEmits<{ click: [] }>();
</script>

<template>
    <div
        class="meal-slot"
        :style="
            entry.recipe?.image_url
                ? {
                      backgroundImage: `url(${entry.recipe.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                  }
                : {}
        "
        @click="$emit('click')"
    >
        <span v-if="entry.addon_ingredients?.length || entry.addon_recipes?.length" class="addon-dot">+</span>
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
