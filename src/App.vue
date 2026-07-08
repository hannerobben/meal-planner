<script setup lang="ts">
import { useRoute } from 'vue-router';
import DefaultLayout from './layouts/DefaultLayout.vue';
</script>

<template>
    <Toast />
    <component
        :is="useRoute().meta.layout ?? DefaultLayout"
        v-bind="useRoute().meta.layoutProps ?? {}"
    />
</template>

<style scoped></style>
