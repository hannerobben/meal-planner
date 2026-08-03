<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRecipeStore } from '../stores/recipe.store.ts';
import RecipeForm from '../components/recipe/RecipeForm.vue';

const route = useRoute();
const router = useRouter();
const recipeStore = useRecipeStore();
const { currentRecipe, loading } = storeToRefs(recipeStore);

const isNew = computed(() => route.params.id === 'new');

watch(
    () => route.params.id,
    async (id) => {
        if (id === 'new') {
            recipeStore.currentRecipe = undefined;
        } else {
            await recipeStore.fetchById(id as string);
        }
    },
    { immediate: true }
);
</script>

<template>
    <div>
        <div class="page-header">
            <Button icon="pi pi-arrow-left" text rounded @click="router.push({ name: 'Recipes' })" />
            <span class="page-title">{{ isNew ? 'New recipe' : 'Edit recipe' }}</span>
        </div>
        <div v-if="loading" style="padding: 20px">Loading…</div>
        <RecipeForm v-else :recipe="isNew ? undefined : currentRecipe" />
    </div>
</template>

<style scoped>
.page-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px 0;
}

.page-title {
    font-size: 1.1rem;
    font-weight: 600;
}
</style>
