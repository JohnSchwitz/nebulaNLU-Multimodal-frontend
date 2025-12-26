<template>
  <div class="create-picture-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- 1. Authentication Status -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">Loading...</div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
       Please log in via Ghost to create images.
    </div>

    <!-- 2. Main Content -->
    <div v-else>
        <div class="mb-6 text-center">
            <h1 class="text-3xl font-bold mb-2">Create AI-Generated Images</h1>
            <p class="text-gray-600">Enter a description below to generate art.</p>
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <h2 class="text-2xl font-bold mb-4">Image Details</h2>

            <div class="mb-4">
                <label for="image-title" class="block text-lg mb-2 font-medium">Image Title</label>
                <input type="text" id="image-title" v-model="imageTitle" placeholder="e.g., Mystical Forest" class="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div class="mb-4">
                <label for="image-description" class="block text-lg mb-2 font-medium">Description (Prompt)</label>
                <textarea
                  id="image-description"
                  v-model="imageDescription"
                  placeholder="e.g., A majestic dragon flying over a castle..."
                  rows="6"
                  class="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                ></textarea>
                 <p class="text-xs text-gray-500 mt-1 text-right">{{ imageDescription.length }} chars (Min 10)</p>
            </div>

            <div class="flex justify-end gap-4 mt-6">
                <button @click="generateImage" :disabled="!canGenerate || isGenerating"
                    class="bg-gray-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {{ isGenerating ? 'Generating...' : 'Generate & Download' }}
                </button>
            </div>
        </div>

        <!-- Feedback Messages -->
        <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">{{ error }}</div>
        <div v-if="successMessage" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">{{ successMessage }}</div>

        <!-- Loading Overlay -->
        <div v-if="isGenerating" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded-lg flex flex-col items-center shadow-xl">
                <div class="spinner mb-4"></div>
                <p class="text-gray-800 font-bold">Painting your image...</p>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router'; // Import Route
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';

const authStore = useAuthStore();
const { userId, isAuthenticated, isLoading: authIsLoading } = storeToRefs(authStore);
const route = useRoute(); // Access URL params

const imageTitle = ref('');
const imageDescription = ref('');
const isGenerating = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Check if story text was passed via URL (The "Great!!" Feature)
onMounted(() => {
  if (route.query.prompt) {
    imageDescription.value = String(route.query.prompt).substring(0, 500); // Pre-fill
  }
  if (route.query.title) {
    imageTitle.value = String(route.query.title);
  }
});

const canGenerate = computed(() => imageDescription.value.trim().length >= 10);

const generateImage = async () => {
  if (!isAuthenticated.value || !userId.value) {
    error.value = "Please log in.";
    return;
  }

  isGenerating.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    const imageBlob = await api.generateImageFromStory({
      prompt: imageDescription.value.trim(),
      user_id: userId.value
    });

    const url = window.URL.createObjectURL(imageBlob);
    const safeTitle = (imageTitle.value.trim() || 'generated_image').replace(/\s+/g, '_');
    const filename = `${safeTitle}.png`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();

    successMessage.value = "Image generated and download started!";
  } catch (err: any) {
    console.error('[CreatePicture] Generation failed:', err);
    error.value = err.message || "Failed to generate image.";
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style scoped>
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #333;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.font-didot { font-family: 'Didot', serif; }
</style>
