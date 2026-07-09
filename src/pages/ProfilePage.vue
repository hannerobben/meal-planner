<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth.store.ts';
import { useAuth } from '../supabase/useAuth.ts';
import { AuthApi } from '../supabase/auth.api.ts';
import {
    ActivityLevel,
    FatLossGoal,
    calculateBMR,
    calculateTDEE,
    calculateMacros
} from '../utils/nutrition.ts';

const authStore = useAuthStore();
const { authUser, appUser } = storeToRefs(authStore);
const { signOut } = useAuth();
const router = useRouter();

const sexOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' }
];

const activityOptions = [
    { label: 'Sedentary', value: ActivityLevel.Sedentary },
    { label: 'Lightly active', value: ActivityLevel.LightlyActive },
    { label: 'Moderately active', value: ActivityLevel.ModeratelyActive },
    { label: 'Very active', value: ActivityLevel.VeryActive },
    { label: 'Super active', value: ActivityLevel.SuperActive }
];

const fatLossGoalOptions = [
    { label: 'Maintenance', value: FatLossGoal.Maintenance },
    { label: 'Mild fat loss / recomp (5–10% deficit)', value: FatLossGoal.MildLoss },
    { label: 'Moderate fat loss (10–20% deficit)', value: FatLossGoal.ModerateLoss }
];

const nutritionForm = ref({
    weight_kg: appUser.value?.weight_kg ?? null,
    height_cm: appUser.value?.height_cm ?? null,
    age: appUser.value?.age ?? null,
    sex: appUser.value?.sex ?? null,
    activity_level: appUser.value?.activity_level ?? null,
    protein_per_kg: appUser.value?.protein_per_kg ?? 1.8,
    fat_loss_goal: (appUser.value?.fat_loss_goal ?? FatLossGoal.Maintenance) as FatLossGoal
});

watch(appUser, (val) => {
    if (!val) return;
    nutritionForm.value = {
        weight_kg: val.weight_kg,
        height_cm: val.height_cm,
        age: val.age,
        sex: val.sex,
        activity_level: val.activity_level,
        protein_per_kg: val.protein_per_kg ?? 1.8,
        fat_loss_goal: (val.fat_loss_goal ?? FatLossGoal.Maintenance) as FatLossGoal
    };
});

const macros = computed(() => {
    const { weight_kg, height_cm, age, sex, activity_level, protein_per_kg, fat_loss_goal } =
        nutritionForm.value;
    if (!weight_kg || !height_cm || !age || !sex || !activity_level) return null;
    const bmr = calculateBMR({ weight_kg, height_cm, age, sex });
    const tdee = calculateTDEE(bmr, activity_level as ActivityLevel);
    return {
        tdee,
        ...calculateMacros({
            tdee,
            weight_kg,
            protein_per_kg: protein_per_kg ?? undefined,
            fat_loss_goal: fat_loss_goal ?? undefined
        })
    };
});

async function saveNutritionProfile() {
    if (!authUser.value) return;
    await AuthApi.updateNutritionProfile(authUser.value.id, nutritionForm.value);
    await authStore.getAppUser();
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

        <div class="section">
            <h3 class="section-title">Nutrition profile</h3>

            <div v-if="macros" class="results">
                <div class="result-card result-card--tdee">
                    <span class="result-label">Daily calorie target</span>
                    <span class="result-value">{{ macros.target_kcal }} <small>kcal</small></span>
                    <span v-if="macros.target_kcal !== macros.tdee" class="result-kcal">TDEE: {{ macros.tdee }} kcal</span>
                </div>
                <div class="macros-row">
                    <div class="result-card">
                        <span class="result-label">Protein</span>
                        <span class="result-value">{{ macros.protein_g }}<small>g</small></span>
                        <span class="result-kcal">{{ macros.protein_kcal }} kcal</span>
                    </div>
                    <div class="result-card">
                        <span class="result-label">Fat</span>
                        <span class="result-value">{{ macros.fat_g }}<small>g</small></span>
                        <span class="result-kcal">{{ macros.fat_kcal }} kcal</span>
                    </div>
                    <div class="result-card">
                        <span class="result-label">Carbs</span>
                        <span class="result-value">{{ macros.carbs_g }}<small>g</small></span>
                        <span class="result-kcal">{{ macros.carbs_kcal }} kcal</span>
                    </div>
                </div>
            </div>

            <Divider />

            <div class="fields-grid">
                <div class="field">
                    <label>Weight (kg)</label>
                    <InputNumber
                        v-model="nutritionForm.weight_kg"
                        :min="20"
                        :max="300"
                        :maxFractionDigits="1"
                        fluid
                    />
                </div>

                <div class="field">
                    <label>Height (cm)</label>
                    <InputNumber
                        v-model="nutritionForm.height_cm"
                        :min="100"
                        :max="250"
                        :maxFractionDigits="1"
                        fluid
                    />
                </div>

                <div class="field">
                    <label>Age</label>
                    <InputNumber
                        v-model="nutritionForm.age"
                        :min="10"
                        :max="120"
                        :maxFractionDigits="0"
                        fluid
                    />
                </div>

                <div class="field">
                    <label>Sex</label>
                    <Select
                        v-model="nutritionForm.sex"
                        :options="sexOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select"
                        fluid
                    />
                </div>

                <div class="field">
                    <label>Activity level</label>
                    <Select
                        v-model="nutritionForm.activity_level"
                        :options="activityOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select"
                        fluid
                    />
                </div>

                <div class="field">
                    <label>Protein target (g/kg)</label>
                    <InputNumber
                        v-model="nutritionForm.protein_per_kg"
                        :min="0.5"
                        :max="4"
                        :maxFractionDigits="1"
                        :step="0.1"
                        fluid
                    />
                </div>

                <div class="field field--full">
                    <label>Goal</label>
                    <Select
                        v-model="nutritionForm.fat_loss_goal"
                        :options="fatLossGoalOptions"
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                </div>
            </div>

            <Button label="Save" @click="saveNutritionProfile" class="save-btn" />

            <Divider />
        </div>

        <Button
            label="Sign out"
            severity="danger"
            outlined
            @click="handleSignOut"
            class="signout"
        />
    </div>
</template>

<style scoped>
.profile-page {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background-color: whitesmoke;

    h2 {
        margin: 0;
    }
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

.section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
}

.fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    .field {
        min-width: 0;
    }

    .field--full {
        grid-column: 1 / -1;
    }
}

.section-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.results {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.macros-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
}

.result-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;

    &--tdee {
        background: #f1f8e9;
        border-color: #c5e1a5;

        .result-value {
            font-size: 1.6rem;
            color: #2e7d32;
        }
    }
}

.result-label {
    font-size: 0.75em;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.result-value {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1;

    small {
        font-size: 0.55em;
        font-weight: 400;
        color: #888;
        margin-left: 1px;
    }
}

.result-kcal {
    font-size: 0.75em;
    color: #999;
    margin-top: 2px;
}

.save-btn {
    width: fit-content;
}

.signout {
    margin-top: 8px;
    width: fit-content;
}
</style>
