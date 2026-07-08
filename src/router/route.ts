import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../pages/LoginPage.vue';
import PlanPage from '../pages/PlanPage.vue';
import RecipesPage from '../pages/RecipesPage.vue';
import RecipeDetailPage from '../pages/RecipeDetailPage.vue';
import IngredientsPage from '../pages/IngredientsPage.vue';
import ShoppingPage from '../pages/ShoppingPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import DefaultLayout from '../layouts/DefaultLayout.vue';
import EmptyLayout from '../layouts/EmptyLayout.vue';
import { useAuthStore } from '../stores/auth.store.ts';

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { layout: EmptyLayout }
    },
    {
        path: '/',
        meta: { requiresAuth: true, layout: DefaultLayout },
        redirect: { name: 'Plan' },
        children: [
            { path: 'plan', name: 'Plan', component: PlanPage },
            { path: 'recipes', name: 'Recipes', component: RecipesPage },
            { path: 'recipes/:id', name: 'RecipeDetail', component: RecipeDetailPage },
            { path: 'ingredients', name: 'Ingredients', component: IngredientsPage },
            { path: 'shopping', name: 'Shopping', component: ShoppingPage },
            { path: 'profile', name: 'Profile', component: ProfilePage }
        ]
    }
];

const router = createRouter({
    history: createWebHistory('/meal-planner/'),
    routes
});

router.beforeEach(async (to, _from, next) => {
    await useAuthStore().getAuthUser();
    const user = useAuthStore().authUser;

    if (to.meta.requiresAuth && !user) {
        next({ name: 'Login' });
    } else if (to.name === 'Login' && user) {
        next({ name: 'Plan' });
    } else {
        next();
    }
});

export default router;
