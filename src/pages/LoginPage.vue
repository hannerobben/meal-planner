<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../supabase/useAuth.ts';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.store.ts';

const authStore = useAuthStore();
const { authUser } = storeToRefs(authStore);

const { signIn, error: authError, loading } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');

async function signInHandler() {
    await signIn(email.value, password.value);
    await authStore.getAuthUserAndAppUser();
    if (authUser.value) {
        router.push({ name: 'Plan' });
    }
}
</script>

<template>
    <div class="wrapper">
        <div>
            <i class="pi pi-apple" style="font-size: 4rem; color: #2E7D32" />
        </div>
        <h1 style="margin: 0">Meal Planner</h1>
        <div class="login-form">
            <InputText v-model="email" placeholder="Email" type="email" />
            <InputText type="password" v-model="password" placeholder="Password" />
            <Button @click="signInHandler" :loading="loading" label="Sign In" />
            <p v-if="authError" class="error">{{ authError.message }}</p>
        </div>
    </div>
</template>

<style scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 20px;

    .login-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 300px;
    }

    .error {
        text-align: center;
        color: red;
        margin: 0;
    }
}
</style>
