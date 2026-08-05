import dayjs from 'dayjs';
import type { RecipeContract } from '../model/recipe.contract.ts';
import type { MealType } from '../model/meal-plan-entry.contract.ts';
import { sumMacros } from './recipe-macros.ts';
import type { MacroTotals } from './recipe-macros.ts';

export interface GeneratedEntry {
    date: string;
    meal_type: MealType;
    slot_index: number;
    recipe_id: string;
}

export interface MacroTarget {
    target_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

// Assumed proportion of daily intake per meal slot
const MEAL_PROPORTIONS: Record<MealType, number> = {
    breakfast: 0.25,
    lunch: 0.30,
    dinner: 0.35,
    snack: 0.10 / 3,
    extra: 0,
};

function recipeMacros(recipe: RecipeContract): MacroTotals {
    return sumMacros(recipe.ingredients ?? []);
}

// Sum of squared relative deviations from proportional target — lower is better
function deviationScore(macros: MacroTotals, target: MacroTarget, proportion: number): number {
    if (!target.target_kcal) return 0;
    const kcal = target.target_kcal * proportion;
    const protein = target.protein_g * proportion;
    const carbs = target.carbs_g * proportion;
    const fat = target.fat_g * proportion;
    return (
        ((macros.calories - kcal) / kcal) ** 2 +
        ((macros.protein_g - protein) / (protein || 1)) ** 2 +
        ((macros.carbs_g - carbs) / (carbs || 1)) ** 2 +
        ((macros.fat_g - fat) / (fat || 1)) ** 2
    );
}

function scaleMacros(m: MacroTotals, f: number): MacroTotals {
    return { calories: m.calories * f, protein_g: m.protein_g * f, carbs_g: m.carbs_g * f, fat_g: m.fat_g * f };
}

function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
    return { calories: a.calories + b.calories, protein_g: a.protein_g + b.protein_g, carbs_g: a.carbs_g + b.carbs_g, fat_g: a.fat_g + b.fat_g };
}

function rankByScore(pool: RecipeContract[], target: MacroTarget, proportion: number): RecipeContract[] {
    return [...pool].sort(
        (a, b) => deviationScore(recipeMacros(a), target, proportion) - deviationScore(recipeMacros(b), target, proportion)
    );
}

function buildDays(startDate: string, endDate: string): string[] {
    const days: string[] = [];
    let cur = dayjs(startDate);
    const end = dayjs(endDate);
    while (!cur.isAfter(end)) {
        days.push(cur.format('YYYY-MM-DD'));
        cur = cur.add(1, 'day');
    }
    return days;
}

/**
 * Generate a full meal plan between startDate and endDate (inclusive).
 *
 * Rules:
 *  - Dinner: 2 recipes, one repeated ceil(n/2) times and one floor(n/2) times,
 *    arranged in a sandwich block pattern (A…A-B…B-A…A) for consecutive days.
 *  - Lunch: same recipe two days in a row, new recipe each pair.
 *  - Breakfast: one recipe per day, rotating through top-scoring candidates.
 *  - Snacks: 3 different snacks per day, rotating start per day for variety.
 *
 * Recipe selection minimises deviation from per-slot macro targets derived from
 * the user's daily target and assumed meal proportions (breakfast 25%, lunch 30%,
 * dinner 35%, snacks 10% split across 3).
 */
export function generateMealPlan(
    startDate: string,
    endDate: string,
    recipes: RecipeContract[],
    target: MacroTarget
): GeneratedEntry[] {
    const days = buildDays(startDate, endDate);
    const n = days.length;
    const entries: GeneratedEntry[] = [];

    const poolFor = (type: MealType) =>
        recipes.filter((r) => !r.not_suggested && r.type.includes(type));

    // --- DINNER: 2 recipes, one gets ceil(n/2) days, one gets floor(n/2) ---
    const dinnerPool = poolFor('dinner');
    if (dinnerPool.length > 0) {
        const countA = Math.ceil(n / 2);
        const countB = n - countA;
        const dinnerByDay = selectDinnerPair(dinnerPool, target, n, countA, countB);
        for (let d = 0; d < n; d++) {
            if (dinnerByDay[d]) {
                entries.push({ date: days[d], meal_type: 'dinner', slot_index: 0, recipe_id: dinnerByDay[d] });
            }
        }
    }

    // --- LUNCH: same meal twice in a row, new recipe each pair ---
    const lunchPool = poolFor('lunch');
    if (lunchPool.length > 0) {
        const ranked = rankByScore(lunchPool, target, MEAL_PROPORTIONS.lunch);
        const pairCount = Math.floor(n / 2);
        const hasSolo = n % 2 === 1;
        const needed = pairCount + (hasSolo ? 1 : 0);

        // Pick `needed` recipes in rank order, cycling if pool is smaller
        const picks = Array.from({ length: needed }, (_, i) => ranked[i % ranked.length]);

        for (let p = 0; p < pairCount; p++) {
            const id = picks[p].id;
            entries.push({ date: days[p * 2], meal_type: 'lunch', slot_index: 0, recipe_id: id });
            entries.push({ date: days[p * 2 + 1], meal_type: 'lunch', slot_index: 0, recipe_id: id });
        }
        if (hasSolo) {
            entries.push({ date: days[n - 1], meal_type: 'lunch', slot_index: 0, recipe_id: picks[pairCount].id });
        }
    }

    // --- BREAKFAST: rotate through top-scoring candidates ---
    const breakfastPool = poolFor('breakfast');
    if (breakfastPool.length > 0) {
        const ranked = rankByScore(breakfastPool, target, MEAL_PROPORTIONS.breakfast);
        for (let d = 0; d < n; d++) {
            entries.push({
                date: days[d],
                meal_type: 'breakfast',
                slot_index: 0,
                recipe_id: ranked[d % ranked.length].id,
            });
        }
    }

    // --- SNACKS: 3 different per day, rotating start for cross-day variety ---
    const snackPool = poolFor('snack');
    if (snackPool.length > 0) {
        const ranked = rankByScore(snackPool, target, MEAL_PROPORTIONS.snack);
        for (let d = 0; d < n; d++) {
            const picked: string[] = [];
            const start = (d * 3) % ranked.length;
            for (let i = 0; i < ranked.length && picked.length < 3; i++) {
                const id = ranked[(start + i) % ranked.length].id;
                if (!picked.includes(id)) picked.push(id);
            }
            // Fallback: if pool has fewer than 3, allow repeats
            while (picked.length < 3) {
                picked.push(ranked[picked.length % ranked.length].id);
            }
            for (let s = 0; s < picked.length; s++) {
                entries.push({ date: days[d], meal_type: 'snack', slot_index: s, recipe_id: picked[s] });
            }
        }
    }

    return entries;
}

function selectDinnerPair(
    pool: RecipeContract[],
    target: MacroTarget,
    n: number,
    countA: number,
    countB: number
): string[] {
    const ranked = rankByScore(pool, target, MEAL_PROPORTIONS.dinner);
    const candidates = ranked.slice(0, Math.min(8, ranked.length));

    let bestA = candidates[0];
    let bestB = candidates[Math.min(1, candidates.length - 1)];

    if (candidates.length >= 2 && target.target_kcal > 0) {
        let bestScore = Infinity;
        for (let i = 0; i < candidates.length; i++) {
            for (let j = 0; j < candidates.length; j++) {
                if (i === j) continue;
                const mA = recipeMacros(candidates[i]);
                const mB = recipeMacros(candidates[j]);
                // Average daily dinner contribution across the week
                const avg = scaleMacros(addMacros(scaleMacros(mA, countA), scaleMacros(mB, countB)), 1 / n);
                const score = deviationScore(avg, target, MEAL_PROPORTIONS.dinner);
                if (score < bestScore) {
                    bestScore = score;
                    bestA = candidates[i];
                    bestB = candidates[j];
                }
            }
        }
    }

    // Sandwich distribution: first half of A, then all of B, then remaining A.
    // This produces consecutive blocks (e.g. AA-BBB-AA for 7 days) rather than alternation.
    const firstA = Math.ceil(countA / 2);
    const lastA = countA - firstA;
    return [
        ...Array(firstA).fill(bestA.id),
        ...Array(countB).fill(bestB.id),
        ...Array(lastA).fill(bestA.id)
    ];
}
