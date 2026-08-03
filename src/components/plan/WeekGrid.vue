<script setup lang="ts">
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import DayColumn from './DayColumn.vue';
import dayjs from 'dayjs';

const props = defineProps<{
    weekStart: string;
    entries: MealPlanEntryContract[];
    householdUserIds: string[];
}>();

const emit = defineEmits<{
    slotClick: [date: string, entries: MealPlanEntryContract[]];
    addClick: [date: string, mealType: MealType, slotIndex: number];
}>();

function getDates(): string[] {
    return Array.from({ length: 7 }, (_, i) =>
        dayjs(props.weekStart).add(i, 'day').format('YYYY-MM-DD')
    );
}

function entriesForDate(date: string) {
    return props.entries.filter((e) => e.date === date);
}
</script>

<template>
    <div class="week-grid">
        <DayColumn
            v-for="date in getDates()"
            :key="date"
            :date="date"
            :entries="entriesForDate(date)"
            :householdUserIds="householdUserIds"
            @slotClick="(date, entries) => emit('slotClick', date, entries)"
            @addClick="(date, mealType, slotIndex) => emit('addClick', date, mealType, slotIndex)"
        />
    </div>
</template>

<style scoped>
.week-grid {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    background: white;
    padding: 12px;
    border-radius: 12px;
}
</style>
