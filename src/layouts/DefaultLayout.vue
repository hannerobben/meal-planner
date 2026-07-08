<script setup lang="ts">
import { onMounted } from 'vue';
import AppFooterMenu from '../components/AppFooterMenu.vue';
import { useIngredientStore } from '../stores/ingredient.store.ts';

onMounted(() => {
    useIngredientStore().fetchAll();
});
</script>

<template>
    <div class="full-page">
        <div class="page-container custom-scrollbar">
            <div class="page-content">
                <RouterView />
            </div>
        </div>
        <AppFooterMenu />
    </div>
</template>

<style scoped>
.full-page {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.page-container {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow-y: auto;

    .page-content {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background-color: whitesmoke;
    }
}
</style>
