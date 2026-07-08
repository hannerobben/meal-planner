<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps<{
    items: { label?: string; route: { name: string }; icon?: string; activeFor?: string[] }[];
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
    <TabMenu :model="items" :activeIndex="activeIndex">
        <template #item="{ item, props: itemProps }">
            <RouterLink v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                <a :href="href" v-bind="itemProps.action" @click="navigate">
                    <div :class="item.icon" style="font-size: 1.2rem" />
                    <div class="label" v-if="item.label">{{ item.label }}</div>
                </a>
            </RouterLink>
        </template>
    </TabMenu>
</template>

<style scoped></style>
