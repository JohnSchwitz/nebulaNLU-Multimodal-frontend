<script setup lang="ts">
import { onMounted } from 'vue'
import CreateStory from './CreateStory.vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

function setupStory() {
  // Get the actual Pinia store instance
  const authStore = useAuthStore();

  // Set authenticated state
  authStore.userId = 'story-user-123';
  authStore.userName = 'Story Teller';
  authStore.userEmail = 'storyteller@example.com';
  authStore.authToken = 'fake-histoire-token';

  console.log('[Histoire] Auth store configured:', {
    isAuthenticated: authStore.isAuthenticated,
    userName: authStore.userName
  });

  // Mock API calls
  api.getUiTexts = async () => {
    console.log('[Histoire] Mock: getUiTexts called');
    return {
      placeholderPrompts: ['A brave knight and a wise dragon...'],
      initialStoryGuidance: 'Welcome {{name}}! Begin your tale by describing your hero or setting...',
    };
  };

  api.startStory = async (data) => {
    console.log('[Histoire] Mock: startStory called with:', data);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return {
      session_id: 'session-histoire-123',
      story: 'In a land of myth and a time of magic, the destiny of a great kingdom rested on the shoulders of a young boy.',
      iteration: 1,
      is_complete: false,
      next_prompt_for_user: 'What was the boy\'s name, and what made him special?',
    };
  };

  api.continueStory = async (data) => {
    console.log('[Histoire] Mock: continueStory called with:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      session_id: data.session_id,
      story: ' His name was Arthur, and he possessed an extraordinary gift—he could speak to animals and understand their wisdom.',
      iteration: 2,
      is_complete: false,
      next_prompt_for_user: 'What adventure did Arthur embark upon?',
    };
  };

  api.completeStory = async (data) => {
    console.log('[Histoire] Mock: completeStory called with:', data);
    await new Promise(resolve => setTimeout(resolve, 1200));
    return {
      session_id: data.session_id,
      full_story: 'In a land of myth and a time of magic, the destiny of a great kingdom rested on the shoulders of a young boy. His name was Arthur, and he possessed an extraordinary gift—he could speak to animals and understand their wisdom. Through many trials and adventures, Arthur grew to become the greatest king the realm had ever known, ruling with wisdom and compassion until the end of his days.',
      iteration: 3,
      is_complete: true,
    };
  };
}
</script>

<template>
  <Story
    title="Views/Create Story"
    :setup="setupStory"
    icon="material-symbols:edit-document-outline"
  >
    <Variant title="Authenticated User - Ready to Start">
      <CreateStory />
    </Variant>
  </Story>
</template>
