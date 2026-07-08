<script setup lang="ts">
import type { CategoryGroup } from '../../stores/shopping.store.ts';
import type { IngredientCategory } from '../../model/ingredient.contract.ts';
import ShoppingItem from './ShoppingItem.vue';

defineProps<{ group: CategoryGroup }>();
defineEmits<{ toggle: [name: string, unit: string, category: IngredientCategory] }>();
</script>

<template>
    <div class="category-group">
        <div class="category-header">
            <span class="category-label" :class="group.category">{{ group.category }}</span>
        </div>
        <ShoppingItem
            v-for="item in group.items"
            :key="`${item.name}|${item.unit}`"
            :item="item"
            @toggle="$emit('toggle', item.name, item.unit, item.category)"
        />
    </div>
</template>

<style scoped>
.category-group {
    margin-bottom: 20px;
}

.category-header {
    padding-bottom: 6px;
    border-bottom: 2px solid #eee;
    margin-bottom: 4px;
}

.category-label {
    text-transform: capitalize;
    background-color: #e0e0e0;
    padding: 2px 10px;
    border-radius: 30px;
    font-size: 0.75em;
    font-weight: 600;

    &.fruit     { background-color: #ffd6a5; }
    &.vegetable { background-color: #b5ead7; }
    &.meat      { background-color: #ffb3ba; }
    &.dairy     { background-color: #b3d9ff; }
    &.other     { background-color: #e0e0e0; }
}
</style>
