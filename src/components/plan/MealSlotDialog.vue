<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MealPlanEntryContract, MealType } from '../../model/meal-plan-entry.contract.ts';
import { MEAL_TYPES } from '../../model/meal-plan-entry.contract.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';

const props = defineProps<{
    visible: boolean;
    entry: MealPlanEntryContract | undefined;
    date: string;
    recipes: RecipeContract[];
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    save: [mealType: MealType | null, recipeId: string | null, freeText: string | null];
    remove: [];
}>();

const mode = ref<'recipe' | 'text'>('recipe');
const selectedRecipeId = ref<string | null>(null);
const freeText = ref('');
const selectedMealType = ref<MealType>('breakfast');

const mealTypeOptions = MEAL_TYPES.map((t) => ({
    label: t.charAt(0).toUpperCase() + t.slice(1),
    value: t,
}));

watch(
    () => props.visible,
    (v) => {
        if (!v) return;
        if (props.entry?.recipe_id) {
            mode.value = 'recipe';
            selectedRecipeId.value = props.entry.recipe_id;
            freeText.value = '';
        } else if (props.entry?.free_text) {
            mode.value = 'text';
            freeText.value = props.entry.free_text;
            selectedRecipeId.value = null;
        } else {
            mode.value = 'recipe';
            selectedRecipeId.value = null;
            freeText.value = '';
            selectedMealType.value = 'breakfast';
        }
    }
);

const recipeOptions = computed(() =>
    props.recipes.map((r) => ({ label: r.name, value: r.id }))
);

const canSave = computed(() =>
    mode.value === 'recipe' ? !!selectedRecipeId.value : !!freeText.value.trim()
);

function handleSave() {
    const mealType = props.entry ? null : selectedMealType.value;
    emit('save', mealType, mode.value === 'recipe' ? selectedRecipeId.value : null, mode.value === 'text' ? freeText.value.trim() : null);
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
            <Select
                v-if="!entry"
                v-model="selectedMealType"
                :options="mealTypeOptions"
                optionLabel="label"
                optionValue="value"
                style="width: 100%"
            />

            <div class="mode-toggle">
                <Button label="From recipe" :outlined="mode !== 'recipe'" @click="mode = 'recipe'" size="small" />
                <Button label="Free text" :outlined="mode !== 'text'" @click="mode = 'text'" size="small" />
            </div>

            <Select
                v-if="mode === 'recipe'"
                v-model="selectedRecipeId"
                :options="recipeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Choose a recipe…"
                filter
                style="width: 100%"
            />

            <InputText
                v-else
                v-model="freeText"
                placeholder="e.g. Leftovers, takeaway…"
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

.mode-toggle {
    display: flex;
    gap: 8px;
}

.dialog-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}
</style>
