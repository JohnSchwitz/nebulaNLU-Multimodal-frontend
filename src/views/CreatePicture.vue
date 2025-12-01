<template>
  <div class="create-picture-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- =================================================== -->
    <!-- 1. Authentication Status Display                  -->
    <!-- =================================================== -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Loading user information...
    </div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         Please log in via Ghost to create images.
       </span>
    </div>
     <div v-else-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         <strong class="font-bold">Authentication Error:</strong> {{ authError }}.
       </span>
     </div>
     <div v-else class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
       <span class="block sm:inline">
         <strong class="font-bold">User:</strong> {{ authUserName || userId }}. Ready to create images.
       </span>
     </div>

    <!-- =================================================== -->
    <!-- Loading Spinner for Actions                       -->
    <!-- =================================================== -->
    <div v-if="isGenerating" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="spinner"></div>
       <p class="text-white ml-3 text-lg">Generating Image...</p>
    </div>

    <!-- =================================================== -->
    <!-- Error/Success Messages                            -->
    <!-- =================================================== -->
    <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-4 mb-4" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ error }}</p>
    </div>
    <div v-if="successMessage" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-4 mb-4" role="alert">
      <p class="font-bold">Success</p>
      <p>{{ successMessage }}</p>
    </div>

    <!-- =================================================== -->
    <!-- Main Content Area (only if authenticated)        -->
    <!-- =================================================== -->
    <div v-if="isAuthenticated">
        <div class="mb-6 text-center">
            <h1 class="text-3xl font-bold mb-4">Create AI-Generated Images</h1>
            <p class="text-lg">Use Vertex AI to bring your visual ideas to life.</p>
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Image Generation Prompt</h2>
            <div class="mb-4">
                <label for="image-title" class="block text-lg mb-2">Image Title (for download filename)</label>
                <input type="text" id="image-title" v-model="imageTitle" placeholder="e.g., Mystical Forest Scene" class="w-full border rounded px-3 py-2"/>
            </div>
            <div class="mb-4">
                <label for="image-description" class="block text-lg mb-2">Describe the Image:</label>
                <textarea id="image-description" v-model="imageDescription" placeholder="e.g., A majestic dragon flying over a medieval castle at sunset, cartoon style..." rows="6" class="w-full border rounded px-3 py-2"></textarea>
                 <p class="text-xs text-gray-500 mt-1">Minimum 10 characters for the description.</p>
            </div>
            <div class="flex justify-end gap-4 mt-4">
                <button @click="generateImage" :disabled="!canGenerate || isGenerating"
                    class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50">
                    {{ isGenerating ? 'Generating...' : 'Generate & Download Image' }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';

// --- Pinia Auth Store ---
const authStore = useAuthStore();
const {
    userId,
    isAuthenticated,
    isLoading: authIsLoading,
    error: authError,
    userName: authUserName
} = storeToRefs(authStore);

// --- Component State ---
const imageTitle = ref('');
const imageDescription = ref('');
const isGenerating = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

// Computed property to enable/disable generation button
const canGenerate = computed(() => imageDescription.value.trim().length >= 10);

// --- Image Generation & Download Method ---
const generateImage = async () => {
  if (!isAuthenticated.value || !userId.value) {
    error.value = "Please log in to generate images.";
    return;
  }

  isGenerating.value = true;
  error.value = null;
  successMessage.value = null;

  try {
    // 1. Call the API (Returns a Blob)
    const imageBlob = await api.generateImageFromStory({
      prompt: imageDescription.value.trim(),
      user_id: userId.value
    });

    // 2. Create a temporary URL for the blob
    const url = window.URL.createObjectURL(imageBlob);

    // 3. Create filename
    const safeTitle = (imageTitle.value.trim() || 'generated_image').replace(/\s+/g, '_');
    const filename = `${safeTitle}.png`;

    // 4. Create hidden anchor to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click(); // Trigger download

    // 5. Cleanup
    window.URL.revokeObjectURL(url);
    a.remove();

    successMessage.value = "Image generated and download started!";

  } catch (err: any) {
    console.error('[CreatePicture.vue] Generation failed:', err);
    error.value = "Failed to generate image. Please try again.";
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style scoped>
.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #fff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.font-didot {
   font-family: 'Didot', 'Bodoni MT', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}
</style>
