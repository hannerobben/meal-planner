<script setup lang="ts">
import { computed } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import MealSlot from './MealSlot.vue';
import dayjs from 'dayjs';

const SLOT_ORDER: MealType[] = ['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'snack'];

const props = defineProps<{
    date: string;
    entries: MealPlanEntryContract[];
    householdUserIds: string[];
}>();

const emit = defineEmits<{
    slotClick: [date: string, entries: MealPlanEntryContract[]];
    addClick: [date: string, mealType: MealType, slotIndex: number];
}>();

const isPast = computed(() => dayjs(props.date).isBefore(dayjs(), 'day'));

const dayLabel = computed(() => {
    const d = new Date(props.date + 'T00:00:00');
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.getDate() };
});

function sortByUser(entries: MealPlanEntryContract[]): MealPlanEntryContract[] {
    return [...entries].sort((a, b) => {
        if (a.user_id === b.user_id) return 0;
        if (a.user_id === null) return -1;
        if (b.user_id === null) return 1;
        return a.user_id.localeCompare(b.user_id);
    });
}

function toPerUser(entries: MealPlanEntryContract[]): (MealPlanEntryContract | null)[] | null {
    if (!entries.some((e) => e.user_id !== null)) return null;
    return props.householdUserIds.map((uid) => entries.find((e) => e.user_id === uid) ?? null);
}

const allSlots = computed(() => {
    const snacks = props.entries.filter((e) => e.meal_type === 'snack');
    let snackIndex = 0;
    const regular = SLOT_ORDER.map((mealType) => {
        let slotEntries: MealPlanEntryContract[];
        let slotIndex: number;
        if (mealType === 'snack') {
            const idx = snackIndex++;
            slotEntries = sortByUser(snacks.filter((e) => e.slot_index === idx));
            slotIndex = idx;
        } else {
            slotEntries = sortByUser(props.entries.filter((e) => e.meal_type === mealType));
            slotIndex = 0;
        }
        return { mealType, entries: slotEntries, slotIndex, perUser: toPerUser(slotEntries), isExtra: false };
    });
    const extraEntries = sortByUser(props.entries.filter((e) => e.meal_type === 'extra'));
    regular.push({ mealType: 'extra' as MealType, entries: extraEntries, slotIndex: 0, perUser: toPerUser(extraEntries), isExtra: true });
    return regular;
});
</script>

<template>
    <div class="day-col" :class="{ past: isPast }">
        <div class="day-header">
            <div class="day-name">{{ dayLabel.day }}</div>
            <div class="day-num">{{ dayLabel.date }}</div>
        </div>
        <div class="slots">
            <template v-for="(slot, i) in allSlots" :key="i">
                <!-- Filled per-user slot -->
                <div
                    v-if="slot.perUser"
                    class="slot-row"
                    :class="{ 'extra-slot-row': slot.isExtra }"
                    @click="emit('slotClick', date, slot.entries)"
                >
                    <div
                        v-for="(entry, pi) in slot.perUser"
                        :key="pi"
                        class="slot-part"
                        :class="{ 'slot-part-divider': pi > 0, 'slot-part-empty': !entry }"
                        :style="
                            !slot.isExtra && entry?.recipe?.image_url
                                ? {
                                      backgroundImage: `url(${entry.recipe.image_url})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center'
                                  }
                                : {}
                        "
                    >
                        <span
                            v-if="entry?.addon_ingredients?.length || entry?.addon_recipes?.length"
                            class="addon-dot"
                            :class="{ 'addon-dot-red': slot.isExtra }"
                        >+</span>
                    </div>
                </div>
                <!-- Filled single-entry regular slot -->
                <MealSlot
                    v-else-if="slot.entries.length === 1 && !slot.isExtra"
                    :entry="slot.entries[0]"
                    @click="emit('slotClick', date, slot.entries)"
                />
                <!-- Filled extra slot (no recipe image) -->
                <div
                    v-else-if="slot.entries.length > 0"
                    class="slot-row extra-slot-row"
                    @click="emit('slotClick', date, slot.entries)"
                >
                    <div class="slot-part">
                        <span
                            v-if="slot.entries[0]?.addon_ingredients?.length || slot.entries[0]?.addon_recipes?.length"
                            class="addon-dot addon-dot-red"
                        >+</span>
                    </div>
                </div>
                <!-- Empty slot -->
                <div
                    v-else
                    class="empty-slot"
                    :class="{ 'extra-empty-slot': slot.isExtra }"
                    @click="emit('addClick', date, slot.mealType, slot.slotIndex)"
                >
                    +
                </div>
            </template>
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

.slot-row {
    display: flex;
    min-height: 36px;
    border-radius: 6px;
    border: 1px solid #9bbd9d;
    background: #f1f8e9;
    overflow: hidden;
}

.slot-part {
    flex: 1;
    cursor: pointer;
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

.slot-part-divider {
    border-left: 1px solid #9bbd9d;
}

.extra-slot-row .slot-part-divider {
    border-left-color: #ef9a9a;
}

.slot-part-empty {
    background: repeating-linear-gradient(-45deg, white, white 4px, #e0e0e0 4px, #e0e0e0 8px);
}

.empty-slot {
    min-height: 36px;
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

.extra-slot-row {
    border-color: #ef9a9a;
    background: #fff5f5;
}

.addon-dot-red {
    background: #ef9a9a;
}

.extra-empty-slot {
    min-height: 36px;
    border-radius: 6px;
    border: 1px dashed #ef9a9a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75em;
    color: #ef9a9a;

    &:hover {
        border-color: #c62828;
        color: #c62828;
    }
}
</style>
