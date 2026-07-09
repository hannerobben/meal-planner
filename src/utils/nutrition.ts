export type Sex = 'male' | 'female';

export enum FatLossGoal {
    Maintenance = 'maintenance',
    MildLoss = 'mild_loss',
    ModerateLoss = 'moderate_loss'
}

const FAT_LOSS_MULTIPLIERS: Record<FatLossGoal, number> = {
    [FatLossGoal.Maintenance]: 1.0,
    [FatLossGoal.MildLoss]: 0.925,
    [FatLossGoal.ModerateLoss]: 0.85
};

export enum ActivityLevel {
    Sedentary = 'sedentary',
    LightlyActive = 'lightly_active',
    ModeratelyActive = 'moderately_active',
    VeryActive = 'very_active',
    SuperActive = 'super_active'
}

export interface MacroTargets {
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    protein_kcal: number;
    fat_kcal: number;
    carbs_kcal: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    [ActivityLevel.Sedentary]: 1.2,
    [ActivityLevel.LightlyActive]: 1.375,
    [ActivityLevel.ModeratelyActive]: 1.55,
    [ActivityLevel.VeryActive]: 1.725,
    [ActivityLevel.SuperActive]: 1.9
};

export function calculateBMR(params: {
    weight_kg: number;
    height_cm: number;
    age: number;
    sex: Sex;
}): number {
    const base = 10 * params.weight_kg + 6.25 * params.height_cm - 5 * params.age;
    return Math.round(params.sex === 'male' ? base + 5 : base - 161);
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateMacros(params: {
    tdee: number;
    weight_kg: number;
    protein_per_kg?: number;
    fat_loss_goal?: FatLossGoal;
}): MacroTargets & { target_kcal: number } {
    const proteinPerKg = params.protein_per_kg ?? 1.9;
    const multiplier = FAT_LOSS_MULTIPLIERS[params.fat_loss_goal ?? FatLossGoal.Maintenance];
    const target_kcal = Math.round(params.tdee * multiplier);

    const protein_g = Math.round(proteinPerKg * params.weight_kg);
    const protein_kcal = protein_g * 4;

    const fat_kcal = Math.round(target_kcal * 0.27);
    const fat_g = Math.round(fat_kcal / 9);

    const carbs_kcal = target_kcal - protein_kcal - fat_kcal;
    const carbs_g = Math.round(carbs_kcal / 4);

    return { target_kcal, protein_g, fat_g, carbs_g, protein_kcal, fat_kcal, carbs_kcal };
}
