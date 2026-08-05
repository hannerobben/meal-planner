<script setup lang="ts">
import { CalendarDays, SquareCheck, CookingPot, Banana, ShoppingCart, User } from 'lucide-vue-next';
import AppTabMenu from './AppTabMenu.vue';

const items = [
    { label: 'Plan', route: { name: 'Plan' }, icon: CalendarDays },
    { label: 'Tracking', route: { name: 'Tracking' }, icon: SquareCheck },
    { label: 'Recipes', route: { name: 'Recipes' }, icon: CookingPot, activeFor: ['Recipes', 'RecipeDetail'] },
    { label: 'Ingredients', route: { name: 'Ingredients' }, icon: Banana },
    { label: 'Shopping', route: { name: 'Shopping' }, icon: ShoppingCart },
    { label: 'Profile', route: { name: 'Profile' }, icon: User }
];
</script>

<template>
    <div class="footer">
        <AppTabMenu :items="items" />
    </div>
</template>

<style scoped></style>
