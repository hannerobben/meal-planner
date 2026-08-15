<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
</script>

<template>
    <div class="header">
        <div class="header-left">
            <Button
                v-if="route.meta.backlink"
                icon="pi pi-arrow-left"
                text
                rounded
                class="back-btn"
                @click="router.push(route.meta.backlink as any)"
            />
        </div>
        <span class="header-title">{{ route.meta.title }}</span>
        <div class="header-right" />
    </div>
</template>

<style scoped>
.header {
    position: relative;
    height: 50px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    border-bottom: 1px solid #dee2e6;
    z-index: 40;
}

.header-left,
.header-right {
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.header-title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    flex: 1;
    text-align: center;
}

.back-btn {
    width: 36px;
    height: 36px;
}
</style>