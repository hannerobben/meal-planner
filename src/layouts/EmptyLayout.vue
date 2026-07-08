<script setup lang="ts"></script>

<template>
    <div class="full-page">
        <slot>
            <RouterView />
        </slot>
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
</style>
