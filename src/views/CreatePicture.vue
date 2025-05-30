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
            <p class="text-lg">Use DALL-E to bring your visual ideas to life.</p>
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
                <button @click="generateImageWithDalle" :disabled="!canGenerate || isGenerating"
                    class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50">
                    {{ isGenerating ? 'Generating...' : 'Generate Image' }}
                </button>
            </div>
        </div>

        <!-- Generated Image Display -->
        <div v-if="generatedImageUrl && !isGenerating" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Generated Image</h2>
            <div class="flex flex-col items-center">
                <img
                  :src="generatedImageUrl"
                  :alt="imageTitle || 'Generated AI image'"
                  class="max-w-full max-h-[512px] w-auto h-auto border rounded shadow-lg mb-4"
                  @error="handleImageDisplayError"
                />
                <div class="w-full flex justify-center gap-4 mt-4">
                    <button @click="downloadGeneratedImage"
                            class="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700">
                        Download This Image
                    </button>
                    <!-- Save to Gallery button is removed as per your request -->
                </div>
            </div>
        </div>
    </div> <!-- End v-if="isAuthenticated" -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api'; // Ensure this path is correct
import { useAuthStore } from '@/stores/auth'; // Ensure this path is correct
import { storeToRefs } from 'pinia';
import { saveAs } from 'file-saver'; // For client-side download

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
const imageDescription = ref(''); // This is the user's prompt for DALL-E
const generatedImageUrl = ref<string | null>(null); // URL of the currently displayed generated image

const isGenerating = ref(false); // To control loading state for generation button
const error = ref<string | null>(null); // For displaying errors to the user
const successMessage = ref<string | null>(null); // For displaying success messages

// Helper to clear messages
const clearMessages = () => {
  console.log("[CreatePicture.vue] clearMessages called");
  successMessage.value = null;
  error.value = null;
};

// Computed property to enable/disable generation button
const canGenerate = computed(() => imageDescription.value.trim().length >= 10);

// --- Image Generation Method ---
const generateImageWithDalle = async () => {
  console.log("[CreatePicture.vue] generateImageWithDalle function CALLED.");
  clearMessages();

  console.log("[CreatePicture.vue] Checking auth. isAuthenticated:", isAuthenticated.value, "userId:", userId.value);
  if (!isAuthenticated.value) {
    error.value = "Please log in to generate images.";
    console.warn("[CreatePicture.vue] generateImageWithDalle: Not authenticated.");
    return;
  }
  if (!userId.value) {
    error.value = "User ID missing. Please re-authenticate.";
    console.warn("[CreatePicture.vue] generateImageWithDalle: User ID missing.");
    return;
  }

  console.log("[CreatePicture.vue] Checking canGenerate:", canGenerate.value);
  if (!canGenerate.value) {
    error.value = "Image description must be at least 10 characters long.";
    console.warn("[CreatePicture.vue] generateImageWithDalle: canGenerate is false.");
    return;
  }

  console.log("[CreatePicture.vue] Checking isGenerating:", isGenerating.value);
  if (isGenerating.value) {
    console.warn("[CreatePicture.vue] generateImageWithDalle: Already generating an image.");
    return;
  }

  isGenerating.value = true;
  generatedImageUrl.value = null; // Clear previous image before new generation
  console.log("[CreatePicture.vue] Set isGenerating=true. Starting API call...");

  try {
    const payload = {
      prompt: imageDescription.value.trim(),
      user_id: userId.value,
      // engine: 'dalle' // Backend defaults to 'dalle' if DEFAULT_IMAGE_ENGINE is set to 'dalle'
                       // and no engine is passed in payload by Vue.
    };
    console.log("[CreatePicture.vue] Calling api.generateImageFromStory with payload:", JSON.stringify(payload));

    const responseFromApi = await api.generateImageFromStory(payload);

    console.log("[CreatePicture.vue] RAW response from api.generateImageFromStory:", JSON.parse(JSON.stringify(responseFromApi)));

    if (responseFromApi && responseFromApi.success && typeof responseFromApi.image_url === 'string' && responseFromApi.image_url.trim() !== '') {
      console.log("[CreatePicture.vue] SUCCESS from backend. Image URL:", responseFromApi.image_url);
      generatedImageUrl.value = responseFromApi.image_url;
      successMessage.value = responseFromApi.message || `Image generated successfully using ${responseFromApi.engine || 'DALL-E'}!`;
      console.log("[CreatePicture.vue] generatedImageUrl set to:", generatedImageUrl.value);
    } else {
      const errorMessage = responseFromApi?.message || responseFromApi?.error || 'Backend response indicates failure, is malformed, or image_url is missing/empty.';
      console.error('[CreatePicture.vue] API call deemed not successful by frontend logic:', errorMessage, 'Full backend response:', JSON.parse(JSON.stringify(responseFromApi)));
      throw new Error(errorMessage);
    }
  } catch (err: any) {
    console.error('[CreatePicture.vue] CATCH BLOCK for generateImageWithDalle:', err);
    error.value = err.message || 'An unexpected error occurred during image generation.';
  } finally {
    isGenerating.value = false;
    console.log("[CreatePicture.vue] Set isGenerating=false. Finished generation attempt.");
  }
};

// --- Image Download Method ---
const downloadGeneratedImage = () => {
  console.log("[CreatePicture.vue] downloadGeneratedImage function CALLED.");
  if (!generatedImageUrl.value) {
    error.value = "No image to download. Please generate an image first.";
    console.warn("[CreatePicture.vue] downloadGeneratedImage: No image URL available.");
    return;
  }
  try {
    const link = document.createElement('a');
    link.href = generatedImageUrl.value; // This is the URL from DALL-E
    link.download = `${(imageTitle.value.trim() || 'ai-generated-image').replace(/\s+/g, '_')}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    successMessage.value = "Download initiated! Check your browser's downloads.";
    console.log("[CreatePicture.vue] Image download initiated for:", generatedImageUrl.value);
  } catch (e: any) {
    console.error("Error triggering image download:", e);
    error.value = "Could not trigger image download. Try right-clicking the image to save, or check browser console for errors related to the image URL itself.";
  }
};

const handleImageDisplayError = (event: Event) => {
    console.error("Error loading generated image into <img> tag. Source:", (event.target as HTMLImageElement)?.src);
    error.value = "The generated image could not be displayed. The URL might be invalid or temporarily unavailable. Try generating again or check the console for the URL.";
    // Optionally set generatedImageUrl to null or a placeholder if the URL is truly bad
    // generatedImageUrl.value = '/placeholder-image-error.png';
};

// --- Lifecycle Hooks ---
onMounted(() => {
    console.log("[CreatePicture.vue] Mounted. isAuthenticated:", isAuthenticated.value, "userId:", userId.value);
    if (!isAuthenticated.value) {
        console.warn("[CreatePicture.vue] User not authenticated on mount. Image generation will be disabled until login.");
    }
    // No data fetching needed on mount for this simplified component
});
</script>

<style scoped>
.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #fff; /* White spinner on dark overlay */
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Base message styling */
.message-base {
    padding: .75rem 1.25rem;
    margin-bottom: 1rem;
    border: 1px solid transparent;
    border-radius: .25rem;
}
.success-message {
    @apply message-base; /* If using Tailwind apply directive */
    color: #155724; /* Dark green text */
    background-color: #d4edda; /* Light green background */
    border-color: #c3e6cb; /* Green border */
}
.error-message {
    @apply message-base; /* If using Tailwind apply directive */
    color: #721c24; /* Dark red text */
    background-color: #f8d7da; /* Light red background */
    border-color: #f5c6cb; /* Red border */
}
.note {
    font-size: 0.875rem;
    color: #6b7280; /* text-gray-500 */
}

/* Font styling from CreateStory.vue - apply if needed */
/*
@font-face {
    font-family: 'Didot';
    src: url('@/assets/fonts/TheanoDidot-Regular.ttf');
    font-weight: normal;
    font-style: normal;
}
.font-didot {
   font-family: 'Didot', 'Bodoni MT', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}
*/
</style>
