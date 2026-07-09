<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import { MEAL_TYPE_COLORS } from '../../model/type-colors.ts';

const props = defineProps<{
    visible: boolean;
    entry: MealPlanEntryContract | undefined;
    date: string;
    recipes: RecipeContract[];
    initialMealType?: MealType;
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [mealType: MealType | null, recipeId: string | null, freeText: string | null];
    remove: [];
}>();

const selectedRecipeId = ref<string | null>(null);

const displayMealType = computed(() => props.entry?.meal_type ?? props.initialMealType ?? 'breakfast');

watch(
    () => props.visible,
    (v) => {
        if (!v) return;
        selectedRecipeId.value = props.entry?.recipe_id ?? null;
    }
);

const recipeOptions = computed(() =>
    props.recipes.map((r) => ({ label: r.name, value: r.id }))
);

const canSave = computed(() => !!selectedRecipeId.value);

function handleSave() {
    const mealType = props.entry ? null : displayMealType.value;
    emit('save', mealType, selectedRecipeId.value, null);
    emit('update:visible', false);
}

const title = computed(() =>
    new Date(props.date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    })
);
</script>

<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="title" modal style="width: 340px">
        <div class="dialog-body">
            <span class="type-badge" :style="{ backgroundColor: MEAL_TYPE_COLORS[displayMealType] }">{{ displayMealType }}</span>

            <Select
                v-model="selectedRecipeId"
                :options="recipeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose a recipe…"
                filter
                style="width: 100%"
            />
        </div>

        <template #footer>
            <div class="dialog-footer">
                <Button
                    v-if="entry"
                    label="Remove"
                    text
                    severity="danger"
                    @click="emit('remove'); emit('update:visible', false)"
                />
                <div style="flex: 1" />
                <Button label="Cancel" text severity="secondary" @click="$emit('update:visible', false)" />
                <Button label="Save" :disabled="!canSave" @click="handleSave" />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.dialog-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 8px;
}

.type-badge {
    text-transform: capitalize;
    padding: 2px 10px;
    border-radius: 30px;
    font-size: 0.6em;
    align-self: flex-start;
}

.dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}
</style>
