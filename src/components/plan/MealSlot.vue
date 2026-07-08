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
                ? { backgroundImage: `url(${entry.recipe.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}
        "
        @click="$emit('click')"
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
    min-height: 44px;
}
</style>
