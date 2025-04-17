// Header.vue
<template>
    <header>
      <div class="header-container">
          <div class="header-top">
            <div class="logo-name-nav-container">
              <img src="../assets/crab-nebula-296x142.jpg" alt="Nebula-NLP Logo" class="logo"/>
              <div class="name-nav">
                <h1 class="site-name">Nebula-NLP.com</h1>
                <nav>
                    <a href="https://nebula-nlp.com">Home</a> <router-link to="/example-story">Example Story</router-link>
                    <router-link to="/create-story">Create Story</router-link>
                    <router-link to="/create-narrative">Create Narrative</router-link>
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

<script>
export default {
  name: 'Header'
}
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
    width: 100%;
}

.logo-name-nav-container {
    display: flex;
    align-items: flex-start;
    width: 100%;
}

.logo {
    max-width: 296px;
    max-height: 142px;
    margin-right: 0px;
}

.name-nav {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;  /* Changed from flex-start to center */
}

.site-name {
    font-size: 40px;
    font-weight: bold;
    margin: 0;
    text-align: center;  /* Added to ensure text is centered */
    width: 100%;        /* Added to ensure full width */
}

nav {
    display: flex;
    gap: 20px;
    margin-top: 10px;
}

nav a {
    padding: 10px;
    color: #000000;
    font-size: 18px;
    text-decoration: none;
    border-radius: 4px;
    transition: all 0.3s ease;
}

nav a.router-link-active {
    background-color: white;
    color: #000000;
    font-weight: bold;
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
</style>