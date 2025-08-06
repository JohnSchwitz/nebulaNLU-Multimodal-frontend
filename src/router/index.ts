import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// --- A flag to prevent the logic from running more than once on the initial load ---
let hasProcessedGhostLogin = false;

// --- View Imports ---
import CreateStory from '../views/CreateStory.vue';
import CreateNarrative from '../views/CreateNarrative.vue';
import CreatePicture from '../views/CreatePicture.vue';
import ExampleStory from '../views/ExampleStory.vue';
import DownloadPage from '../views/DownloadPage.vue';
import AdminView from '../admin/views/AdminView.vue';
import AdminLogin from '../admin/views/AdminLogin.vue';

const routes = [
  { path: '/', redirect: '/create-story' },
  { path: '/create-story', name: 'CreateStory', component: CreateStory },
  { path: '/create-narrative', name: 'CreateNarrative', component: CreateNarrative },
  { path: '/create-picture', name: 'CreatePicture', component: CreatePicture },
  { path: '/example-story', name: 'ExampleStory', component: ExampleStory },
  { path: '/download', name: 'DownloadPage', component: DownloadPage },
  { path: '/admin-login', name: 'AdminLogin', component: AdminLogin },
  { path: '/admin', name: 'Admin', component: AdminView, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// --- THIS IS THE NEW, MORE POWERFUL NAVIGATION GUARD ---
router.beforeEach((to, from, next) => {
  // --- Part 1: Ghost Login Processing (The Shortcut) ---
  // This block will only run ONCE when the user first lands on the site.
  if (!hasProcessedGhostLogin && to.query.ghost_member_uuid) {
    console.log('[Router Guard] Detected Ghost login parameters in URL. Processing...');

    // Set the flag to true so this logic doesn't run on subsequent navigations
    hasProcessedGhostLogin = true;

    // Get a direct reference to the auth store
    const authStore = useAuthStore();

    // Extract all the data from the URL
    const userData = {
      userId: to.query.ghost_member_uuid as string,
      userEmail: to.query.ghost_member_email as string | undefined,
      userName: to.query.ghost_member_name as string | undefined,
      userStatus: to.query.ghost_member_status as string | undefined,
    };

    // Call the Pinia action to process the login and get the backend token.
    // We don't need to wait for it to finish here.
    authStore.processGhostLogin(userData);

    // Clean the URL by removing the query parameters, then proceed.
    // This provides a much better user experience.
    return next({ ...to, query: {} });
  }

  // --- Part 2: Admin Route Protection ---
  // This is your existing logic for protecting the admin page.
  if (to.meta.requiresAuth) {
    if (localStorage.getItem('isAdmin') === 'true') {
      return next(); // Proceed to the admin page
    } else {
      return next('/admin-login'); // Redirect to admin login
    }
  }

  // --- Part 3: Default Case ---
  // If no special conditions are met, just proceed with the navigation.
  return next();
});

export default router;
