<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useShoppingStore } from '../stores/shopping.store.ts';
import ShoppingCategory from '../components/shopping/ShoppingCategory.vue';
import type { IngredientCategory } from '../model/ingredient.contract.ts';
import dayjs from 'dayjs';

const shoppingStore = useShoppingStore();
const { categorizedList, loading, from, to } = storeToRefs(shoppingStore);

onMounted(() => shoppingStore.fetchForRange());

const fromDate = computed<Date | null>({
    get: () => (from.value ? dayjs(from.value).toDate() : null),
    set: (val: Date | null) => {
        if (val) {
            from.value = dayjs(val).format('YYYY-MM-DD');
            shoppingStore.fetchForRange();
        }
    }
});

const toDate = computed<Date | null>({
    get: () => (to.value ? dayjs(to.value).toDate() : null),
    set: (val: Date | null) => {
        if (val) {
            to.value = dayjs(val).format('YYYY-MM-DD');
            shoppingStore.fetchForRange();
        }
    }
});

const multiplier = ref<1 | 2>(2);
const multiplierOptions = [
    { label: 'x1', value: 1 },
    { label: 'x2', value: 2 }
];

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

        <div class="multiplier-row">
            <label>Portions</label>
            <SelectButton v-model="multiplier" :options="multiplierOptions" optionLabel="label" optionValue="value" :allowEmpty="false" />
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
                :multiplier="multiplier"
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

    h2 {
        margin: 0;
    }
}

.date-range {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
        font-size: 0.85em;
        color: #555;
    }

    :deep(.p-datepicker) {
        width: 140px;
    }
}

.multiplier-row {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
        font-size: 0.85em;
        color: #555;
    }
}

.loading,
.empty {
    text-align: center;
    color: #888;
    padding: 40px 0;
}
</style>
