<script setup lang="ts">
import { computed } from 'vue';
import type { MealPlanEntryContract } from '../../model/meal-plan-entry.contract.ts';
import MealSlot from './MealSlot.vue';
import dayjs from 'dayjs';

const MIN_SLOTS = 4;

const props = defineProps<{
    date: string;
    entries: MealPlanEntryContract[];
}>();

const emit = defineEmits<{
    slotClick: [date: string, entry: MealPlanEntryContract];
    addClick: [date: string];
}>();

const isPast = computed(() => dayjs(props.date).isBefore(dayjs(), 'day'));

const dayLabel = computed(() => {
    const d = new Date(props.date + 'T00:00:00');
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.getDate() };
});

const emptySlotCount = computed(() => Math.max(1, MIN_SLOTS - props.entries.length));
</script>

<template>
    <div class="day-col" :class="{ past: isPast }">
        <div class="day-header">
            <div class="day-name">{{ dayLabel.day }}</div>
            <div class="day-num">{{ dayLabel.date }}</div>
        </div>
        <div class="slots">
            <MealSlot
                v-for="entry in entries"
                :key="entry.id"
                :entry="entry"
                @click="emit('slotClick', date, entry)"
            />
            <div
                v-for="i in emptySlotCount"
                :key="`empty-${i}`"
                class="empty-slot"
                @click="emit('addClick', date)"
            >+</div>
        </div>
    </div>
</template>

<style scoped>
.day-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;

    &.past {
        opacity: 0.4;
    }
}

.day-header {
    text-align: center;
    padding-bottom: 4px;
}

.day-name {
    font-size: 0.75em;
    text-transform: uppercase;
    color: #888;
}

.day-num {
    font-size: 1.1em;
    font-weight: 700;
}

.slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.empty-slot {
    min-height: 44px;
    border-radius: 6px;
    border: 1px dashed #ccc;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
    color: #bbb;

    &:hover {
        border-color: #999;
        color: #888;
    }
}
</style>
