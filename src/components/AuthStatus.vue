<template>
  <div class="auth-status-wrapper">
    <!-- Loading State -->
    <div v-if="authStore.loading" class="auth-compact loading">
      <div class="spinner-small"></div>
      <span class="text-sm">Checking...</span>
    </div>

    <!-- Error State - Compact -->
    <div v-else-if="authStore.error" class="auth-compact error">
      <span class="error-icon">⚠️</span>
      <button @click="handleRetry" class="retry-btn">Retry</button>
    </div>

    <!-- Authenticated State - User Menu -->
    <div v-else-if="authStore.isAuthenticated" class="auth-compact authenticated">
      <div class="user-badge" @click="toggleMenu">
        <div class="avatar-small">{{ userInitial }}</div>
        <span class="user-name-small">{{ displayName }}</span>
        <span class="dropdown-arrow">▼</span>
      </div>

      <!-- Dropdown Menu -->
      <div v-if="showMenu" class="dropdown-menu" @click.stop>
        <div class="menu-header">
          <div class="avatar-large">{{ userInitial }}</div>
          <div class="user-info-dropdown">
            <p class="user-name-large">{{ displayName }}</p>
            <p class="user-email-small">{{ authStore.userEmail }}</p>
          </div>
        </div>
        <div class="menu-divider"></div>
        <button @click="handleLogout" class="menu-item logout-btn">
          <span class="logout-icon">🚪</span>
          Logout
        </button>
      </div>
    </div>

    <!-- Not Authenticated State - Compact -->
    <div v-else class="auth-compact not-authenticated">
      <a
        :href="signInUrl"
        class="signin-btn"
      >
        Sign In
      </a>
      <button @click="handleRefresh" class="refresh-btn" title="Already signed in? Click to refresh">
        ↻
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const showMenu = ref(false)

// Computed properties
const displayName = computed(() => {
  return authStore.userName || authStore.userEmail?.split('@')[0] || 'User'
})

const userInitial = computed(() => {
  return displayName.value.charAt(0).toUpperCase()
})

// Sign-in URL - points to Ghost redirect page that will send user back with token
const signInUrl = computed(() => {
  // In production, this should be your Ghost redirect page URL
  // Example: https://nebula-nlu.com/redirect-to-app
  return `${authStore.GHOST_URL}/launch-story-creator`
})

// Event handlers
function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

async function handleRetry() {
  authStore.clearError()
  await authStore.checkAuthStatus()
}

async function handleLogout() {
  closeMenu()
  if (confirm('Are you sure you want to logout?')) {
    await authStore.logout()
  }
}

// async function handleRefresh() {
//   await authStore.refreshAuth()
// }

// Close menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.auth-compact')) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.auth-status-wrapper {
  position: relative;
  font-family: 'Didot', 'Didot LT STD', 'Hoefler Text', 'Garamond', 'Times New Roman', serif;
}

.auth-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 40px;
}

/* Loading State */
.auth-compact.loading {
  justify-content: center;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #FF9B40;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.auth-compact.error {
  background: #ffebee;
  border: 1px solid #f44336;
}

.error-icon {
  font-size: 1rem;
}

.retry-btn {
  padding: 4px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  font-family: inherit;
}

.retry-btn:hover {
  background: #d32f2f;
}

/* Authenticated State */
.auth-compact.authenticated {
  cursor: pointer;
  padding: 6px 12px;
  transition: all 0.2s;
}

.auth-compact.authenticated:hover {
  background: #f5f5f5;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF9B40 0%, #FF9579 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: bold;
}

.user-name-small {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #2c3e50;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 0.625rem;
  color: #666;
  transition: transform 0.2s;
}

/* Dropdown Menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  z-index: 1000;
  overflow: hidden;
}

.menu-header {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #FFC107 0%, #FF9B40 100%);
}

.avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  color: #FF9B40;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
  flex-shrink: 0;
}

.user-info-dropdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: white;
}

.user-name-large {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.user-email-small {
  font-size: 0.8125rem;
  opacity: 0.9;
  margin: 0;
  word-break: break-all;
}

.menu-divider {
  height: 1px;
  background: #e0e0e0;
}

.menu-item {
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit;
  color: #2c3e50;
}

.menu-item:hover {
  background: #f5f5f5;
}

.logout-btn {
  color: #e74c3c;
  font-weight: 500;
}

.logout-btn:hover {
  background: #ffebee;
}

.logout-icon {
  font-size: 1rem;
}

/* Not Authenticated State */
.auth-compact.not-authenticated {
  gap: 6px;
}

.signin-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #FF9B40 0%, #FF9579 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  font-family: inherit;
  display: inline-block;
}

.signin-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(255, 155, 64, 0.4);
}

.refresh-btn {
  padding: 6px 10px;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover {
  background: #f5f5f5;
  border-color: #FF9B40;
  color: #FF9B40;
}

.text-sm {
  font-size: 0.875rem;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .user-name-small {
    display: none;
  }

  .dropdown-menu {
    right: -20px;
  }
}
</style>
