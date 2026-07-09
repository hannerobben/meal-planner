<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '../../stores/auth.store.ts';
import { useIngredientStore } from '../../stores/ingredient.store.ts';
import { RecipeApi } from '../../supabase/recipe.api.ts';
import type { RecipeContract } from '../../model/recipe.contract.ts';
import type { IngredientContract, IngredientCategory } from '../../model/ingredient.contract.ts';
import { INGREDIENT_CATEGORIES } from '../../model/ingredient.contract.ts';
import type { IngredientInput } from '../../supabase/ingredient.api.ts';
import RecipeIngredientRow from './RecipeIngredientRow.vue';
import type { RecipeIngredientRowData } from './RecipeIngredientRow.vue';
import { MEAL_TYPES, type MealType } from '../../model/meal-plan-entry.contract.ts';

const props = defineProps<{ recipe?: RecipeContract }>();

const toast = useToast();
const authStore = useAuthStore();
const ingredientStore = useIngredientStore();

onMounted(() => {
    if (!ingredientStore.ingredients.length) ingredientStore.fetchAll();
});

const name = ref(props.recipe?.name ?? '');
const type = ref<MealType>(props.recipe?.type ?? 'dinner');
const notes = ref(props.recipe?.notes ?? '');

const typeOptions = MEAL_TYPES.map((t) => ({
    label: t.charAt(0).toUpperCase() + t.slice(1),
    value: t
}));

const recipeId = ref<string | null>(props.recipe?.id ?? null);
const currentImageUrl = ref<string | null>(props.recipe?.image_url ?? null);
let _pendingCreate: Promise<string | null> | null = null;

const fileInput = ref<HTMLInputElement | null>(null);
const pendingImageFile = ref<File | null>(null);
const removeImageFlag = ref(false);

const previewUrl = computed(() => {
    if (removeImageFlag.value) return null;
    if (pendingImageFile.value) return URL.createObjectURL(pendingImageFile.value);
    return currentImageUrl.value;
});

async function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    pendingImageFile.value = file;
    removeImageFlag.value = false;
    await saveRecipe();
}

async function clearImage() {
    pendingImageFile.value = null;
    removeImageFlag.value = true;
    if (fileInput.value) fileInput.value.value = '';
    await saveRecipe();
}

let _keyCounter = 0;

const ingredients = ref<RecipeIngredientRowData[]>(
    props.recipe?.ingredients?.map((ri, idx) => ({
        _key: String(idx),
        ingredient_id: ri.ingredient_id,
        ingredient: ri.ingredient ?? null,
        quantity: ri.quantity
    })) ?? []
);

async function removeIngredient(index: number) {
    ingredients.value.splice(index, 1);
    await saveIngredients();
}

type IngredientSuggestion = IngredientContract | { id: '__new__'; name: string };
const ingredientSearchValue = ref<IngredientSuggestion | null>(null);
const ingredientSuggestions = ref<IngredientSuggestion[]>([]);

function searchIngredients(event: { query: string }) {
    const q = event.query.toLowerCase();
    const matches = ingredientStore.ingredients.filter((i) => i.name.toLowerCase().includes(q));
    ingredientSuggestions.value = [
        ...matches,
        { id: '__new__', name: `+ Create "${event.query}"` }
    ];
}

async function onIngredientSelect(event: { value: IngredientSuggestion }) {
    await nextTick();
    ingredientSearchValue.value = null;
    if (event.value.id === '__new__') {
        const match = event.value.name.match(/^\+ Create "(.+)"$/);
        openCreateDialog(match?.[1] ?? '');
        return;
    }
    const ing = event.value as IngredientContract;
    ingredients.value.push({
        _key: String(++_keyCounter),
        ingredient_id: ing.id,
        ingredient: ing,
        quantity: 0
    });
    await saveIngredients();
}

const showCreateDialog = ref(false);
const categoryOptions = INGREDIENT_CATEGORIES.map((c) => ({ label: c, value: c }));
const newDraft = ref<IngredientInput>({
    name: '',
    category: 'other' as IngredientCategory,
    base_unit: 'g',
    calories_per_100: 0,
    protein_g_per_100: 0,
    carbs_g_per_100: 0,
    fat_g_per_100: 0
});

function openCreateDialog(prefill: string) {
    newDraft.value = {
        name: prefill,
        category: 'other' as IngredientCategory,
        base_unit: 'g',
        calories_per_100: 0,
        protein_g_per_100: 0,
        carbs_g_per_100: 0,
        fat_g_per_100: 0
    };
    showCreateDialog.value = true;
}

async function saveNew() {
    if (!newDraft.value.name.trim()) return;
    try {
        const created = await ingredientStore.create(newDraft.value);
        ingredients.value.push({
            _key: String(++_keyCounter),
            ingredient_id: created.id,
            ingredient: created,
            quantity: 0
        });
        showCreateDialog.value = false;
        await saveIngredients();
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

async function ensureRecipeExists(): Promise<string | null> {
    if (recipeId.value) return recipeId.value;
    if (!name.value.trim()) return null;
    if (_pendingCreate) return _pendingCreate;
    _pendingCreate = RecipeApi.create(
        authStore.householdId!,
        name.value.trim(),
        type.value,
        notes.value || null
    )
        .then((created) => {
            recipeId.value = created.id;
            return created.id;
        })
        .catch((e) => {
            toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
            return null;
        })
        .finally(() => {
            _pendingCreate = null;
        });
    return _pendingCreate;
}

async function saveRecipe() {
    if (!name.value.trim()) return;
    const id = await ensureRecipeExists();
    if (!id) return;
    try {
        if (removeImageFlag.value) {
            await RecipeApi.deleteImage(id);
            currentImageUrl.value = null;
            removeImageFlag.value = false;
        } else if (pendingImageFile.value) {
            currentImageUrl.value = await RecipeApi.uploadImage(id, pendingImageFile.value);
            pendingImageFile.value = null;
        }
        await RecipeApi.update(
            id,
            name.value.trim(),
            type.value,
            notes.value || null,
            currentImageUrl.value
        );
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

async function saveIngredients() {
    const id = await ensureRecipeExists();
    if (!id) return;
    try {
        const validIngredients = ingredients.value
            .filter((ri) => ri.ingredient_id && ri.quantity > 0)
            .map((ri) => ({ ingredient_id: ri.ingredient_id, quantity: ri.quantity }));
        await RecipeApi.upsertRecipeIngredients(id, validIngredients);
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Save failed', detail: String(e), life: 4000 });
    }
}

const totals = computed(() => {
    return ingredients.value.reduce(
        (acc, ri) => {
            if (!ri.ingredient || !ri.quantity) return acc;
            const f = ri.quantity / 100;
            return {
                calories: acc.calories + ri.ingredient.calories_per_100 * f,
                protein_g: acc.protein_g + ri.ingredient.protein_g_per_100 * f,
                carbs_g: acc.carbs_g + ri.ingredient.carbs_g_per_100 * f,
                fat_g: acc.fat_g + ri.ingredient.fat_g_per_100 * f
            };
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
});
</script>

<template>
    <div class="recipe-form">
        <div
            class="image-upload"
            :style="previewUrl ? { backgroundImage: `url(${previewUrl})` } : {}"
            @click="fileInput?.click()"
        >
            <span v-if="!previewUrl" class="image-placeholder">
                <i class="pi pi-image" />
                <span>Add photo</span>
            </span>
            <button v-if="previewUrl" class="remove-image" @click.stop="clearImage">
                <i class="pi pi-times" />
            </button>
        </div>
        <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileChange"
        />

        <div class="field">
            <label>Name *</label>
            <InputText v-model="name" placeholder="Recipe name" @blur="saveRecipe" />
        </div>

        <div class="field">
            <label>Type *</label>
            <SelectButton
                v-model="type"
                :options="typeOptions"
                optionLabel="label"
                optionValue="value"
                :allowEmpty="false"
                @change="saveRecipe"
            />
        </div>

        <div class="field">
            <label>Notes</label>
            <Textarea
                v-model="notes"
                placeholder="Instructions, tips…"
                rows="3"
                autoResize
                @blur="saveRecipe"
            />
        </div>

        <div class="ingredients-section">
            <h3 class="ingredients-title">Ingredients</h3>

            <div class="ingredient-search">
                <AutoComplete
                    v-model="ingredientSearchValue"
                    :suggestions="ingredientSuggestions"
                    optionLabel="name"
                    placeholder="Search to add ingredient…"
                    @complete="searchIngredients"
                    @option-select="onIngredientSelect"
                    dropdown
                    fluid
                />
            </div>

            <div v-if="ingredients.length" class="ingredient-labels">
                <span>Ingredient</span>
                <span>Qty</span>
                <span></span>
                <span></span>
            </div>

            <RecipeIngredientRow
                v-for="(ing, idx) in ingredients"
                :key="ing._key"
                v-model="ingredients[idx]"
                @remove="removeIngredient(idx)"
                @quantityBlur="saveIngredients"
            />

            <div v-if="ingredients.length" class="totals">
                <span class="macro">{{ Math.round(totals.calories) }}kcal</span>
                <span class="macro">P: {{ Math.round(totals.protein_g * 10) / 10 }}g</span>
                <span class="macro">C: {{ Math.round(totals.carbs_g * 10) / 10 }}g</span>
                <span class="macro">F: {{ Math.round(totals.fat_g * 10) / 10 }}g</span>
            </div>
        </div>

        <Dialog
            v-model:visible="showCreateDialog"
            header="New Ingredient"
            modal
            style="width: 360px"
        >
            <div class="new-form">
                <div class="field">
                    <label>Name *</label>
                    <InputText v-model="newDraft.name" />
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
                <Button
                    label="Cancel"
                    text
                    severity="secondary"
                    @click="showCreateDialog = false"
                />
                <Button label="Save" @click="saveNew" :disabled="!newDraft.name.trim()" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.recipe-form {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background-color: whitesmoke;
}

.image-upload {
    height: 180px;
    border: 2px dashed #ddd;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    position: relative;
    overflow: hidden;

    &:hover {
        border-color: #aaa;
    }
}

.image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #aaa;
    pointer-events: none;

    i {
        font-size: 2rem;
    }
}

.remove-image {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: rgba(0, 0, 0, 0.75);
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
        font-size: 0.85em;
        color: #555;
    }
}

.ingredients-title {
    margin: 0 0 4px;
}

.ingredient-search {
    width: 100%;
    margin-bottom: 18px;

    :deep(input) {
        width: 100%;
    }
}

.new-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.macro-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.ingredient-labels {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 100px) 3rem 2.5rem;
    gap: 6px;
    font-size: 0.75em;
    color: #888;
    padding: 0 2px;
}

.totals {
    margin-top: 12px;
    font-size: 0.9em;
    color: #333;
    border: 1px solid lightgray;
    padding: 8px 12px;
    border-radius: 8px;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;

    .macro {
        background-color: #adebe0;
        color: #006351;
        padding: 2px 6px;
        border-radius: 4px;
        flex: 1;
        text-align: center;
    }
}
</style>
