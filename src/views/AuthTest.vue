<!-- views/AuthTest.vue -->
<template>
  <div class="auth-test">
    <h1>Authentication Test</h1>

    <div v-if="loading" class="loading">Testing authentication...</div>

    <div v-else-if="user" class="auth-success">
      <h2>Authentication Successful! ✅</h2>
      <div class="user-info">
        <p><strong>User ID:</strong> {{ user.id }}</p>
        <p><strong>Name:</strong> {{ user.name }}</p>
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Membership:</strong> {{ user.tier }}</p>
      </div>

      <button @click="testSaveStory" :disabled="savingStory">
        {{ savingStory ? 'Saving...' : 'Test Save Story' }}
      </button>

      <div v-if="saveResult" class="save-result">
        <p>{{ saveResult }}</p>
      </div>
    </div>

    <div v-else class="auth-error">
      <h2>Not Authenticated ❌</h2>
      <p>{{ error || 'No authentication token found.' }}</p>
      <p>Please log in through Ghost to access this page.</p>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

export default {
  setup() {
    const user = ref(null);
    const loading = ref(true);
    const error = ref('');
    const saveResult = ref('');
    const savingStory = ref(false);

    onMounted(async () => {
      // Check for token in localStorage
      const token = localStorage.getItem('nebula_token');
      const userData = localStorage.getItem('nebula_user');

      if (token && userData) {
        try {
          // Verify token is still valid
          const response = await api.verifyToken(token);
          if (response.success) {
            user.value = JSON.parse(userData);
          } else {
            error.value = 'Authentication token expired or invalid.';
          }
        } catch (err) {
          error.value = `Authentication error: ${err.message}`;
        }
      } else {
        error.value = 'No authentication token found.';
      }

      loading.value = false;
    });

    const testSaveStory = async () => {
      savingStory.value = true;
      try {
        const response = await api.saveStory({
          story_name: 'Authentication Test Story',
          story_content: 'This is a test story created to verify authentication works correctly.'
        });

        saveResult.value = `Story saved successfully with ID: ${response.story_id}`;
      } catch (err) {
        saveResult.value = `Error saving story: ${err.message}`;
      } finally {
        savingStory.value = false;
      }
    };

    return {
      user,
      loading,
      error,
      saveResult,
      savingStory,
      testSaveStory
    };
  }
}
</script>
