import { createRouter, createWebHistory } from 'vue-router'
import CreateStory from '../views/CreateStory.vue'
import CreateNarrative from '../views/CreateNarrative.vue'
import ExampleStory from '../views/ExampleStory.vue'
import AdminView from '../admin/views/AdminView.vue'
import AdminLogin from '../admin/views/AdminLogin.vue'

const routes = [
  {
    path: '/',
    redirect: '/create-story'
  },
  {
    path: '/create-story',
    name: 'CreateStory',
    component: CreateStory
  },
  {
    path: '/create-narrative',
    name: 'CreateNarrative',
    component: CreateNarrative
  },
  {
    path: '/example-story',
    name: 'ExampleStory',
    component: ExampleStory
  },
  {
    path: '/admin-login',
    name: 'AdminLogin',
    component: AdminLogin
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    if (localStorage.getItem('isAdmin') === 'true') {
      next()
    } else {
      next('/admin-login')
    }
  } else {
    next()
  }
})

export default router