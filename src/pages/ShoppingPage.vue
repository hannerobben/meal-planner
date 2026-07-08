<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useShoppingStore } from '../stores/shopping.store.ts';
import ShoppingCategory from '../components/shopping/ShoppingCategory.vue';
import type { IngredientCategory } from '../model/ingredient.contract.ts';
import dayjs from 'dayjs';

const shoppingStore = useShoppingStore();
const { categorizedList, loading, from, to } = storeToRefs(shoppingStore);

onMounted(() => shoppingStore.fetchForRange());

const fromDate = computed<Date | null>({
    get: () => from.value ? dayjs(from.value).toDate() : null,
    set: (val: Date | null) => {
        if (val) {
            from.value = dayjs(val).format('YYYY-MM-DD');
            shoppingStore.fetchForRange();
        }
    }
});

const toDate = computed<Date | null>({
    get: () => to.value ? dayjs(to.value).toDate() : null,
    set: (val: Date | null) => {
        if (val) {
            to.value = dayjs(val).format('YYYY-MM-DD');
            shoppingStore.fetchForRange();
        }
    }
});

function toggle(name: string, unit: string, category: IngredientCategory) {
    shoppingStore.toggleChecked(name, unit, category);
}
</script>

<template>
    <div class="shopping-page">
        <div class="shopping-header">
            <h2 class="title" style="margin-bottom: 0">Shopping List</h2>
        </div>

        <div class="date-range">
            <label>From</label>
            <DatePicker v-model="fromDate" dateFormat="D d M" />
            <label>To</label>
            <DatePicker v-model="toDate" dateFormat="D d M" />
        </div>

        <div v-if="loading" class="loading">Loading…</div>
        <div v-else-if="!categorizedList.length" class="empty">
            No ingredients found for this period.
        </div>
        <div v-else>
            <ShoppingCategory
                v-for="group in categorizedList"
                :key="group.category"
                :group="group"
                @toggle="toggle"
            />
        </div>
    </div>
</template>

<style scoped>
.shopping-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.shopping-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.date-range {
    display: flex;
    align-items: center;
    gap: 10px;

    label { font-size: 0.85em; color: #555; }

    :deep(.p-datepicker) { width: 140px; }
}

.loading, .empty {
    text-align: center;
    color: #888;
    padding: 40px 0;
}
</style>
