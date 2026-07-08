<script setup lang="ts">
import type { IngredientContract } from '../../model/ingredient.contract.ts';

defineProps<{ ingredient: IngredientContract }>();
const emit = defineEmits<{
    edit: [];
}>();
</script>

<template>
    <div class="ingredient-item" @click="emit('edit')">
        <div class="top">
            <span class="ing-name">{{ ingredient.name }}</span>
            <span class="ing-meta" :class="ingredient.category">{{ ingredient.category }}</span>
        </div>
        <div class="display-row">
            <div class="macros">
              <span class="ing-macro">
                <span>kcal</span>
                <span>{{ ingredient.calories_per_100 }}</span>
              </span>
              <span class="ing-macro">
                <span>Protein</span>
                <span>{{ ingredient.protein_g_per_100 }}g</span>
              </span>
              <span class="ing-macro">
                <span>Carbs</span>
                <span>{{ ingredient.carbs_g_per_100 }}g</span>
              </span>
              <span class="ing-macro">
                <span>Fat</span>
                <span>{{ ingredient.fat_g_per_100 }}g</span>
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ingredient-item {
    background: white;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    .ing-meta {
      text-transform: capitalize;
      background-color: #e0e0e0;

      &.fruit      { background-color: #ffd6a5; }
      &.vegetable  { background-color: #b5ead7; }
      &.meat       { background-color: #ffb3ba; }
      &.dairy      { background-color: #b3d9ff; }

      &.other      { background-color: #e0e0e0; }
      padding: 2px 10px;
      border-radius: 30px;
      font-size: 0.6em;
    }
  }
}

.display-row {
    display: flex;
  justify-content: space-between;
  align-items: center;
}

.ing-name { font-weight: 500; }
.ing-meta { font-size: 0.85em; color: #666; }
.ing-macro { font-size: 0.8em; color: #555; }

.macros {
  display: flex;
  gap: 8px;

  .ing-macro {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid #ededed;
    padding-right: 8px;
    min-width: fit-content;
  }
}

</style>
