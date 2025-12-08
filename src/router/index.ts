import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
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

// --- THE DEFINITIVE ASYNC ROUTER GUARD ---
// This guard now blocks navigation until the Ghost login process is fully complete.
router.beforeEach(async (to, from, next) => {

  // CAPTURE FULL URL AND PARAMS
  console.log('=' .repeat(60));
  console.log('🔍 ROUTER GUARD - FULL URL DEBUG');
  console.log('=' .repeat(60));
  console.log('Full URL:', window.location.href);
  console.log('Path:', to.path);
  console.log('Query params:', to.query);
  console.log('ghost_member_uuid:', to.query.ghost_member_uuid);
  console.log('ghost_member_email:', to.query.ghost_member_email);
  console.log('ghost_member_name:', to.query.ghost_member_name);
  console.log('ghost_member_status:', to.query.ghost_member_status);
  console.log('=' .repeat(60));

  // It's important to get a fresh instance of the store inside the guard.
  const authStore = useAuthStore();
  const ghostUserId = to.query.ghost_member_uuid as string | undefined;

  // Check if this is a Ghost login redirect by looking for the UUID in the URL.
  if (ghostUserId) {
    console.log('[Router Guard] Detected Ghost login parameters in URL. Awaiting processing...');
    try {
      // AWAIT the entire login process to complete. The user will not navigate
      // to the next page until this promise resolves.
      await authStore.processGhostLogin({
        userId: ghostUserId,
        userEmail: to.query.ghost_member_email as string | undefined,
        userName: to.query.ghost_member_name as string | undefined,
        userStatus: to.query.ghost_member_status as string | undefined,
      });

      console.log('[Router Guard] Ghost login successful. Cleaning URL and proceeding to navigation.');

      // Clean the URL query parameters after successful login to avoid reprocessing.
      const newQuery = { ...to.query };
      delete newQuery.ghost_member_uuid;
      delete newQuery.ghost_member_email;
      delete newQuery.ghost_member_name;
      delete newQuery.ghost_member_status;

      // Proceed with the navigation, but with a clean URL. `replace: true` prevents
      // the user from hitting the "back" button and re-triggering the login.
      next({ path: to.path, query: newQuery, replace: true });

    } catch (error) {
      console.error('[Router Guard] Ghost login process failed.', error);
      // If login fails, redirect to the home page to show an error message.
      next('/');
    }
  } else {
    // This is not a Ghost login redirect, so proceed with normal navigation immediately.
    next();
  }
});

export default router;
