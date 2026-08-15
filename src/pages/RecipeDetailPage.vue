<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useRecipeStore } from '../stores/recipe.store.ts';
import RecipeForm from '../components/recipe/RecipeForm.vue';

const route = useRoute();
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
        <div v-if="loading" style="padding: 20px">Loading…</div>
        <RecipeForm v-else :recipe="isNew ? undefined : currentRecipe" />
    </div>
</template>

