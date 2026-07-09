export interface AppUserContract {
    id: string;
    household_id: string;
    display_name: string;
    created_at: string;
    weight_kg: number | null;
    height_cm: number | null;
    age: number | null;
    sex: 'male' | 'female' | null;
    activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'super_active' | null;
    protein_per_kg: number | null;
    fat_loss_goal: 'maintenance' | 'mild_loss' | 'moderate_loss' | null;
}
