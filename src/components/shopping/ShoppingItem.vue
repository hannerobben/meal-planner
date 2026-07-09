<script setup lang="ts">
import type { AggregatedItem } from '../../stores/shopping.store.ts';

defineProps<{ item: AggregatedItem; multiplier: 1 | 2 }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
    <div class="shopping-item" :class="{ checked: item.checked }" @click="$emit('toggle')">
        <Checkbox :modelValue="item.checked" @update:modelValue="$emit('toggle')" @click.stop binary />
        <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">{{ item.quantity * multiplier }} {{ item.unit }}</span>
        </div>
    </div>
</template>

<style scoped>
.shopping-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;

    &.checked .item-name {
        text-decoration: line-through;
        color: #aaa;
    }
}

.item-info {
    flex: 1;
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.item-name { font-size: 0.95em; }
.item-qty  { font-size: 0.75em; color: #888; margin-left: auto; }
</style>
