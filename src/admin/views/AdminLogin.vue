<template>
    <div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-didot mb-6 text-center">Admin Login</h2>
      <form @submit.prevent="login" class="space-y-4">
        <div>
          <input 
            type="password"
            v-model="password"
            placeholder="Enter admin password"
            class="w-full p-2 border rounded"
            @input="error = ''"
          />
        </div>
        <div>
          <button 
            type="submit"
            class="w-full bg-nebula-yellow text-black p-2 rounded font-bold"
          >
            Login
          </button>
        </div>
        <p v-if="error" class="text-red-500 text-center">{{ error }}</p>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    name: 'AdminLogin',
    data() {
      return {
        password: '',
        error: ''
      }
    },
    methods: {
      async login() {
        if (this.password === 'ZaQ!2wsx') {
          localStorage.setItem('isAdmin', 'true')
          try {
            await this.$router.push('/admin')
          } catch (err) {
            console.error('Navigation error:', err)
          }
        } else {
          this.error = 'Invalid password'
          this.password = ''
        }
      }
    }
  }
  </script>