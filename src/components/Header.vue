<template>
    <header>
      <div class="header-container">
          <div class="header-top">
            <div class="logo-name-nav-container">
              <img src="../assets/crab-nebula-296x142.jpg" alt="Nebula-NLP Logo" class="logo"/>
              <div class="name-nav">
                <h1 class="site-name">Nebula-NLP.com</h1>
                <nav>
                    <a href="https://nebula-nlu.com">Home</a>
                    <router-link to="/example-story">Example Story</router-link>
                    <router-link to="/create-story">Create Story</router-link>
                    <router-link to="/create-picture">Create Picture</router-link>
                    <router-link to="/download">Download Stories</router-link>
                </nav>
              </div>
            </div>
          </div>
          <div class="subtitle-container">
            <h2 class="site-subtitle-1">Capturing Fleeting Memories with your Children</h2>
            <h3 class="site-subtitle-2">Reading and Story Generation with your child using Artificial Intelligence</h3>
          </div>
          <div class="image-area">
            <img src="../assets/FearlessPrincessHazel.png" alt="Girl on fire-breathing dragon" class="header-image">
          </div>
      </div>
    </header>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AuthStatus from '@/components/AuthStatus.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Check authentication when header mounts (happens once when app loads)
// onMounted(() => {
//   authStore.checkAuthStatus()
// })
</script>

<style scoped>
header {
  background-color: #FFC107;
  padding: 10px;
}

.header-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  gap: 20px;
}

.logo-name-nav-container {
  display: flex;
  align-items: flex-start;
  flex-grow: 1;
}

.logo {
  max-width: 296px;
  max-height: 142px;
  margin-right: 0px;
  flex-shrink: 0;
}

.name-nav {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.site-name {
  font-size: 40px;
  font-weight: bold;
  margin: 0;
  text-align: center;
  width: 100%;
}

nav {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

nav a {
  padding: 10px;
  color: #000000;
  font-size: 18px;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.3s ease;
}

nav a:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

nav a.router-link-active {
  background-color: white;
  color: #000000;
  font-weight: bold;
}

/* Auth Section - Top Right */
.auth-section {
  flex-shrink: 0;
  min-width: 200px;
  max-width: 300px;
}

.subtitle-container {
  text-align: center;
  margin: 20px 0;
}

.site-subtitle-1 {
  font-size: 32px;
  margin: 0;
}

.site-subtitle-2 {
  font-size: 24px;
  margin-top: 10px;
}

.image-area {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.header-image {
  max-width: 300px;
  height: auto;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .header-top {
    flex-direction: column;
    align-items: center;
  }

  .logo-name-nav-container {
    flex-direction: column;
    align-items: center;
  }

  .logo {
    margin-bottom: 15px;
  }

  .auth-section {
    margin-top: 15px;
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .site-name {
    font-size: 32px;
  }

  .site-subtitle-1 {
    font-size: 24px;
  }

  .site-subtitle-2 {
    font-size: 18px;
  }

  nav {
    gap: 10px;
  }

  nav a {
    font-size: 16px;
    padding: 8px;
  }

  .logo {
    max-width: 200px;
  }
}
</style>
