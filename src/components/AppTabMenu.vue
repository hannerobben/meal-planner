<script setup lang="ts">
import { ref, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps<{
    items: { label?: string; route: { name: string }; icon?: Component; activeFor?: string[] }[];
}>();

const route = useRoute();
const activeIndex = ref(0);

watch(
    () => route.name,
    (newPath) => {
        const routeName = String(newPath);
        const foundIndex = props.items.findIndex((item) =>
            (item.activeFor ?? [item.route.name]).includes(routeName)
        );
        activeIndex.value = foundIndex !== -1 ? foundIndex : 0;
    },
    { immediate: true }
);
</script>

<template>
    <TabMenu :model="items as any" :activeIndex="activeIndex">
        <template #item="{ item, props: itemProps, active }">
            <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                <a
                    :href="href"
                    v-bind="itemProps.action"
                    @click="navigate"
                    :class="{ 'tab-active': active }"
                >
                    <component :is="item.icon" :size="22" :stroke-width="1.75" />
                </a>
            </RouterLink>
        </template>
    </TabMenu>
</template>

<style scoped>
a {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    flex-shrink: 0;
    border-radius: 10px;
    margin: 4px;
    color: #888;
    transition:
        background 0.15s,
        color 0.15s;
}

:deep([data-pc-section='itemlink']) {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border: none;
    min-height: unset;
}

a.tab-active {
    background: #2e7d32;
    color: white;
}

:deep([data-pc-section='activeBar']) {
    display: none;
}

:deep(.p-tabmenu-active-bar) {
    display: none;
}
</style>
