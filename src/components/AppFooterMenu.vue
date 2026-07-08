<script setup lang="ts">
import AppTabMenu from './AppTabMenu.vue';

const items = [
    { label: 'Plan', route: { name: 'Plan' }, icon: 'pi pi-fw pi-calendar' },
    { label: 'Recipes', route: { name: 'Recipes' }, icon: 'pi pi-fw pi-book', activeFor: ['Recipes', 'RecipeDetail'] },
    { label: 'Ingredients', route: { name: 'Ingredients' }, icon: 'pi pi-fw pi-list' },
    { label: 'Shopping', route: { name: 'Shopping' }, icon: 'pi pi-fw pi-shopping-cart' }
];
</script>

<template>
    <div class="footer">
        <AppTabMenu :items="items" />
    </div>
</template>

<style scoped></style>
