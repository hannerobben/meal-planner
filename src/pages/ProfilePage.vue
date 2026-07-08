<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.store.ts';
import { useAuth } from '../supabase/useAuth.ts';
import { AuthApi } from '../supabase/auth.api.ts';

const authStore = useAuthStore();
const { authUser, appUser } = storeToRefs(authStore);
const { signOut } = useAuth();
const router = useRouter();

const editingName = ref(false);
const nameInput = ref(appUser.value?.display_name ?? '');

watch(appUser, (val) => {
    if (val && !nameInput.value) {
        nameInput.value = val.display_name;
    }
});

async function saveName() {
    if (!authUser.value || !nameInput.value.trim()) return;
    await AuthApi.updateDisplayName(authUser.value.id, nameInput.value.trim());
    await authStore.getAppUser();
    editingName.value = false;
}

async function handleSignOut() {
    await signOut();
    authStore.clearUsers();
    router.push({ name: 'Login' });
}
</script>

<template>
    <div class="profile-page">
        <h2 class="title">Profile</h2>

        <div class="field">
            <label>Email</label>
            <p>{{ authUser?.email }}</p>
        </div>

        <div class="field">
            <label>Display name</label>
            <div v-if="!editingName" class="name-row">
                <p>{{ appUser?.display_name }}</p>
                <Button icon="pi pi-pencil" text @click="editingName = true" />
            </div>
            <div v-else class="name-row">
                <InputText v-model="nameInput" />
                <Button icon="pi pi-check" @click="saveName" />
                <Button icon="pi pi-times" text severity="secondary" @click="editingName = false" />
            </div>
        </div>

        <Button label="Sign out" severity="danger" outlined @click="handleSignOut" class="signout" />
    </div>
</template>

<style scoped>
.profile-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.field label {
    font-size: 0.8em;
    color: #666;
    display: block;
    margin-bottom: 4px;
}

.field p {
    margin: 0;
}

.name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.signout {
    margin-top: 24px;
    width: fit-content;
}
</style>
