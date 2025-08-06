<template>
  <div class="min-h-screen bg-nebula-yellow font-didot">
    <div class="max-w-7xl mx-auto px-4">
      <Header />
      <main>
        <router-view></router-view>
      </main>
      <Footer />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'

</script>


