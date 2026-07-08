<script setup lang="ts">
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useIngredientStore } from '../stores/ingredient.store.ts';
import { INGREDIENT_CATEGORIES, type IngredientCategory } from '../model/ingredient.contract.ts';
import type { IngredientContract } from '../model/ingredient.contract.ts';
import type { IngredientInput } from '../supabase/ingredient.api.ts';
import IngredientItem from '../components/ingredients/IngredientItem.vue';

const toast = useToast();
const store = useIngredientStore();

const categoryOptions = INGREDIENT_CATEGORIES.map((c) => ({ label: c, value: c }));

// ── Sort ─────────────────────────────────────────────────────────────────────

type SortKey =
    | 'name'
    | 'category'
    | 'calories_per_100'
    | 'protein_g_per_100'
    | 'carbs_g_per_100'
    | 'fat_g_per_100';

const sortOptions: { label: string; value: SortKey }[] = [
    { label: 'Name', value: 'name' },
    { label: 'Type', value: 'category' },
    { label: 'kcal', value: 'calories_per_100' },
    { label: 'Protein', value: 'protein_g_per_100' },
    { label: 'Carbs', value: 'carbs_g_per_100' },
    { label: 'Fat', value: 'fat_g_per_100' }
];

const sortKey = ref<SortKey>('name');
const sortAsc = ref(true);
const searchQuery = ref('');
const selectedCategory = ref<IngredientCategory | null>(null);

const sortedIngredients = computed(() => {
    const key = sortKey.value;
    const q = searchQuery.value.trim().toLowerCase();
    return [...store.ingredients]
        .filter((i) => !q || i.name.toLowerCase().includes(q))
        .filter((i) => !selectedCategory.value || i.category === selectedCategory.value)
        .sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            const cmp =
                typeof av === 'string'
                    ? (av as string).localeCompare(bv as string)
                    : (av as number) - (bv as number);
            return sortAsc.value ? cmp : -cmp;
        });
});

// ── Edit dialog ──────────────────────────────────────────────────────────────

const showEditDialog = ref(false);
const editingIngredient = ref<IngredientContract | null>(null);
const editDraft = ref<IngredientInput>({
    name: '',
    category: 'other' as IngredientCategory,
    base_unit: 'g',
    calories_per_100: 0,
    protein_g_per_100: 0,
    carbs_g_per_100: 0,
    fat_g_per_100: 0
});

function startEdit(ingredient: IngredientContract) {
    editingIngredient.value = ingredient;
    editDraft.value = {
        name: ingredient.name,
        category: ingredient.category,
        base_unit: ingredient.base_unit,
        calories_per_100: ingredient.calories_per_100,
        protein_g_per_100: ingredient.protein_g_per_100,
        carbs_g_per_100: ingredient.carbs_g_per_100,
        fat_g_per_100: ingredient.fat_g_per_100
    };
    showEditDialog.value = true;
}

async function saveEdit() {
    if (!editingIngredient.value) return;
    try {
        await store.update(editingIngredient.value.id, editDraft.value);
        showEditDialog.value = false;
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

// ── New dialog ───────────────────────────────────────────────────────────────

const showNewDialog = ref(false);
const newDraft = ref<IngredientInput>({
    name: '',
    category: 'other' as IngredientCategory,
    base_unit: 'g',
    calories_per_100: 0,
    protein_g_per_100: 0,
    carbs_g_per_100: 0,
    fat_g_per_100: 0
});

function openNewDialog() {
    newDraft.value = {
        name: '',
        category: 'other' as IngredientCategory,
        base_unit: 'g',
        calories_per_100: 0,
        protein_g_per_100: 0,
        carbs_g_per_100: 0,
        fat_g_per_100: 0
    };
    showNewDialog.value = true;
}

async function saveNew() {
    if (!newDraft.value.name.trim()) return;
    try {
        await store.create(newDraft.value);
        showNewDialog.value = false;
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}
</script>

<template>
    <div class="ingredients-page">
        <div class="page-header">
            <h2>Ingredients</h2>
            <Button icon="pi pi-plus" label="New" @click="openNewDialog" />
        </div>
        <div class="sort-bar">
            <IconField>
                <InputIcon class="pi pi-search" />
                <InputText v-model="searchQuery" placeholder="Search…" />
            </IconField>
            <div class="sort-controls">
                <Select
                    v-model="sortKey"
                    :options="sortOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Sort by…"
                    size="small"
                />
                <Button
                    :icon="sortAsc ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down'"
                    text
                    severity="secondary"
                    @click="sortAsc = !sortAsc"
                    class="sort-dir-btn"
                />
            </div>
        </div>

        <div class="category-chips">
            <span
                v-for="cat in INGREDIENT_CATEGORIES"
                :key="cat"
                class="category-chip"
                :class="[cat, { active: selectedCategory === cat }]"
                @click="selectedCategory = selectedCategory === cat ? null : cat"
                >{{ cat }}</span
            >
        </div>

        <div v-if="store.loading" style="padding: 20px">Loading…</div>

        <div v-else class="ingredient-list">
            <IngredientItem
                v-for="ingredient in sortedIngredients"
                :key="ingredient.id"
                :ingredient="ingredient"
                @edit="startEdit(ingredient)"
            />

            <div v-if="!store.ingredients.length" class="empty">
                No ingredients yet. Add one to get started.
            </div>
        </div>

        <!-- Edit dialog (single instance) -->
        <Dialog
            v-model:visible="showEditDialog"
            header="Edit Ingredient"
            modal
            style="width: 360px"
        >
            <div class="form">
                <div class="field">
                    <label>Name *</label>
                    <InputText v-model="editDraft.name" placeholder="e.g. Chicken breast" />
                </div>
                <div class="field">
                    <label>Category</label>
                    <Select
                        v-model="editDraft.category"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                    />
                </div>
                <div class="field">
                    <label>Base unit</label>
                    <InputText v-model="editDraft.base_unit" placeholder="g" />
                </div>
                <div class="macro-row">
                    <div class="field">
                        <label>kcal / 100</label>
                        <InputNumber v-model="editDraft.calories_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Protein / 100</label>
                        <InputNumber v-model="editDraft.protein_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Carbs / 100</label>
                        <InputNumber v-model="editDraft.carbs_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Fat / 100</label>
                        <InputNumber v-model="editDraft.fat_g_per_100" :min="0" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="showEditDialog = false" />
                <Button label="Save" @click="saveEdit" :disabled="!editDraft.name.trim()" />
            </template>
        </Dialog>

        <!-- New ingredient dialog -->
        <Dialog v-model:visible="showNewDialog" header="New Ingredient" modal style="width: 360px">
            <div class="form">
                <div class="field">
                    <label>Name *</label>
                    <InputText v-model="newDraft.name" placeholder="e.g. Chicken breast" />
                </div>
                <div class="field">
                    <label>Category</label>
                    <Select
                        v-model="newDraft.category"
                        :options="categoryOptions"
                        optionLabel="label"
                        optionValue="value"
                    />
                </div>
                <div class="field">
                    <label>Base unit</label>
                    <InputText v-model="newDraft.base_unit" placeholder="g" />
                </div>
                <div class="macro-row">
                    <div class="field">
                        <label>kcal / 100</label>
                        <InputNumber v-model="newDraft.calories_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Protein / 100</label>
                        <InputNumber v-model="newDraft.protein_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Carbs / 100</label>
                        <InputNumber v-model="newDraft.carbs_g_per_100" :min="0" />
                    </div>
                    <div class="field">
                        <label>Fat / 100</label>
                        <InputNumber v-model="newDraft.fat_g_per_100" :min="0" />
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" text severity="secondary" @click="showNewDialog = false" />
                <Button label="Save" @click="saveNew" :disabled="!newDraft.name.trim()" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.ingredients-page {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    height: 100%;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
        margin: 0;
    }
}

.sort-bar {
    display: flex;
    justify-content: space-between;
    gap: 8px;

    :deep(.p-iconfield) {
        flex: 1;
    }
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 2px;
}

.sort-dir-btn {
    background: white;
}

.category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.category-chip {
    text-transform: capitalize;
    padding: 4px 12px;
    border-radius: 30px;
    font-size: 0.78em;
    cursor: pointer;
    background-color: #e0e0e0;
    border: 2px solid transparent;
    user-select: none;

    &.fruit {
        background-color: #ffd6a5;
    }
    &.vegetable {
        background-color: #b5ead7;
    }
    &.meat {
        background-color: #ffb3ba;
    }
    &.dairy {
        background-color: #b3d9ff;
    }

    &.other {
        background-color: #e0e0e0;
    }

    &.active {
        border-color: #555;
    }
}

.ingredient-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    min-height: 0;
}

.empty {
    color: #999;
    font-size: 0.9em;
    padding: 20px 0;
    text-align: center;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
        font-size: 0.8em;
        color: #555;
    }
}

.macro-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    .field {
        min-width: 0;
    }
}

.macro-row :deep(.p-inputnumber-input) {
    display: flex;
    width: 100%;
    min-width: 0;
}
</style>
