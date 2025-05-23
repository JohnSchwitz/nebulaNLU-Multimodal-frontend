<template>
  <div class="create-picture-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- Authentication Status -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">Loading user information...</div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline"><strong class="font-bold">Login Required:</strong> Please log in.</span>
    </div>
    <div v-else-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline"><strong class="font-bold">Auth Error:</strong> {{ authError }}</span>
    </div>
    <div v-else class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
       <span class="block sm:inline"><strong class="font-bold">User:</strong> {{ authUserName || userId }}. Ready to create images.</span>
    </div>

    <!-- Loading Spinner -->
    <div v-if="isGenerating || isSaving || imagesLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="spinner"></div> <p class="text-white ml-3 text-lg">Processing...</p>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-4" role="alert">
      <p class="font-bold">Error</p>
      <p>{{ error }}</p>
    </div>
    <div v-if="successMessage" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mt-4" role="alert">
      <p class="font-bold">Success</p>
      <p>{{ successMessage }}</p>
    </div>

    <!-- Main Content Area (only if authenticated) -->
    <div v-if="isAuthenticated">
        <div class="mb-6 text-center">
            <h1 class="text-3xl font-bold mb-4">Create AI-Generated Images</h1>
            <p class="text-lg leading-relaxed">Describe the image you want to generate.</p>
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Image Generation</h2>
            <div class="mb-4">
                <label for="image-title" class="block text-lg mb-2">Image Title (Optional)</label>
                <input type="text" id="image-title" v-model="imageTitle" placeholder="e.g., Sunset Over Mountains" class="w-full border rounded px-3 py-2"/>
            </div>
            <div class="mb-4">
                <label for="image-description" class="block text-lg mb-2">Image Description / Prompt</label>
                <textarea id="image-description" v-model="imageDescription" placeholder="Describe the image (minimum 10 characters)..." rows="6" class="w-full border rounded px-3 py-2"></textarea>
            </div>
            <div class="flex justify-end gap-4 mt-4">
                <button @click="generateImage" :disabled="!canGenerate || isGenerating"
                    class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50"
                    :title="canGenerate ? 'Generate new image' : 'Enter description (min 10 chars)'">
                    {{ isGenerating ? 'Generating...' : 'Generate New Image' }}
                </button>
            </div>
        </div>

        <!-- Generated Image Display -->
        <div v-if="generatedImageUrl && !isGenerating" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Generated Image</h2>
            <div class="flex flex-col items-center">
                <img :src="generatedImageUrl" :alt="imageTitle || 'Generated image'" class="max-w-full max-h-[500px] border rounded shadow-lg mb-4"/>
                <div class="w-full flex justify-center gap-4 mt-4">
                    <button @click="downloadGeneratedImage" class="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700">
                        Download Image
                    </button>
                    <button @click="saveImage" :disabled="isSaving" class="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                        {{ isSaving ? 'Saving...' : 'Save to My Gallery' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Gallery Section -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">My Saved Image Gallery</h2>
            <div v-if="imagesLoading" class="text-center text-gray-500 py-4">Loading gallery...</div>
            <div v-else-if="loadSavedImagesError" class="error-message">{{ loadSavedImagesError }}</div>
            <div v-else-if="savedImages.length === 0 && !imagesLoading" class="text-center text-gray-500 py-4">
                You haven't saved any images yet.
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="image in savedImages" :key="image.image_id" class="border rounded p-2 text-center relative group">
                    <img :src="image.image_url || '/placeholder-image.png'" <!-- Display the direct image_url stored -->
                         :alt="image.metadata?.image_title || image.prompt?.substring(0,30) || 'Saved image'"
                         class="w-full h-32 object-cover mb-2 cursor-pointer"
                         @click="viewImageInNewTab(image.image_url)"
                         @error="handleImageError"/>
                    <p class="text-sm truncate font-semibold" :title="image.metadata?.image_title || image.prompt">{{ image.metadata?.image_title || image.prompt?.substring(0,30) || 'Untitled' }}</p>
                    <p class="text-xs text-gray-500">{{ formatDate(image.created_at) }}</p>
                    <!-- Delete button can be added later if api.deleteImage is implemented -->
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts"> // Added lang="ts" for better type checking if you use it
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { saveAs } from 'file-saver';

const authStore = useAuthStore();
const { userId, isAuthenticated, isLoading: authIsLoading, error: authError, userName: authUserName } = storeToRefs(authStore);

const imageTitle = ref('');
const imageDescription = ref(''); // User's prompt
const generatedImageUrl = ref<string | null>(null);
const promptUsedForGeneration = ref(''); // Store the prompt that led to the current image

const isGenerating = ref(false);
const isSaving = ref(false);
const imagesLoading = ref(false); // For gallery
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const loadSavedImagesError = ref<string | null>(null);

interface SavedImage {
  image_id: string;
  image_url: string;
  prompt?: string; // The prompt used for generation
  engine?: string;
  metadata?: { image_title?: string; [key: string]: any }; // Flexible metadata
  created_at: string | Date; // Assuming Firestore timestamp or ISO string
}
const savedImages = ref<SavedImage[]>([]);

const formatDate = (dateInput: string | Date | undefined): string => {
    if (!dateInput) return 'N/A';
    try {
        // Firestore Timestamps might be objects with toDate() method
        const date = (typeof dateInput === 'object' && 'toDate' in dateInput)
            ? (dateInput as any).toDate()
            : new Date(dateInput);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return String(dateInput); // Fallback
    }
};

const clearMessages = () => {
  successMessage.value = null;
  error.value = null;
};

const canGenerate = computed(() => imageDescription.value.trim().length >= 10); // Min 10 chars

const generateImage = async () => {
  if (!isAuthenticated.value) { error.value = "Please log in to generate images."; return; }
  if (!userId.value) { error.value = "User ID missing. Please re-authenticate."; return; }
  if (!canGenerate.value || isGenerating.value) return;

  isGenerating.value = true;
  clearMessages();
  generatedImageUrl.value = null;
  promptUsedForGeneration.value = '';

  try {
    const payload = {
      prompt: imageDescription.value.trim(),
      user_id: userId.value,
      // engine: 'dalle' // Or 'imagen_vertex', could be a reactive ref if user can choose
    };
    console.log("Calling api.generateImageFromStory with payload:", payload);
    const response = await api.generateImageFromStory(payload); // Uses the correct function name

    if (response && response.success && response.image_url) {
      generatedImageUrl.value = response.image_url;
      promptUsedForGeneration.value = payload.prompt; // Store the prompt used
      successMessage.value = response.message || 'Image generated successfully!';
    } else {
      throw new Error(response?.message || response?.error || 'Failed to generate image from server.');
    }
  } catch (err: any) {
    console.error('API Error generating image:', err);
    error.value = err.message || 'An unexpected error occurred.';
  } finally {
    isGenerating.value = false;
  }
};

const saveImage = async () => {
  if (!generatedImageUrl.value || !isAuthenticated.value || !userId.value) {
    error.value = "No image to save or not authenticated.";
    return;
  }
  isSaving.value = true;
  clearMessages();

  try {
    const payload = {
      image_url: generatedImageUrl.value,
      metadata: { // Example metadata
        image_title: imageTitle.value.trim() || 'Untitled AI Image',
        prompt: promptUsedForGeneration.value || imageDescription.value, // The prompt that generated this image
        generated_at: new Date().toISOString(),
      },
      user_id: userId.value
    };
    console.log("Calling api.saveImage with payload:", payload);
    const response = await api.saveImage(payload);

    if (response && response.success && response.image_id) {
      successMessage.value = 'Image saved to your gallery!';
      await loadSavedImages(); // Refresh gallery after saving
    } else {
      throw new Error(response?.message || response?.error || 'Failed to save image.');
    }
  } catch (err: any) {
    console.error('API Error saving image:', err);
    error.value = err.message || 'An unexpected error occurred while saving.';
  } finally {
    isSaving.value = false;
  }
};

const loadSavedImages = async () => {
  if (!isAuthenticated.value) {
    // console.warn("loadSavedImages: User not authenticated. Clearing saved images.");
    // savedImages.value = []; // Already handled by watcher
    return;
  }
  if (!userId.value || typeof userId.value !== 'string') {
    loadSavedImagesError.value = "User ID is missing. Cannot load saved images.";
    console.error("[CreatePicture] loadSavedImages: userId is invalid or undefined:", userId.value);
    savedImages.value = []; // Clear if userId is bad
    return;
  }

  imagesLoading.value = true;
  loadSavedImagesError.value = null;
  console.log(`[CreatePicture] Fetching saved images for user ID: ${userId.value}`);
  try {
    const imagesData = await api.getUserImages(userId.value); // Pass the reactive .value
    savedImages.value = imagesData.map(img => ({
        ...img,
        // Assuming image_url is directly usable, or you might need signed URLs later
        // For now, we'll use the image_url field if it's stored in Firestore as publicly accessible
        // or if it's a data URI from DALL-E that was saved.
    }));
  } catch (e: any) {
    console.error('[CreatePicture] Error fetching saved images:', e);
    loadSavedImagesError.value = e.message || "Failed to load your image gallery.";
  } finally {
    imagesLoading.value = false;
  }
};

const handleImageError = (event: Event) => {
  console.warn("Image failed to load in gallery:", (event.target as HTMLImageElement)?.src);
  (event.target as HTMLImageElement).src = '/placeholder-image-error.png'; // Path to your placeholder
};

const viewImageInNewTab = (imageUrl: string | null) => {
  if (imageUrl) {
    window.open(imageUrl, '_blank');
  } else {
    alert('Image URL not available.');
  }
};

const downloadGeneratedImage = () => {
  if (!generatedImageUrl.value) { error.value = "No image to download."; return; }
  try {
    saveAs(generatedImageUrl.value, `${(imageTitle.value || 'ai-generated-image').replace(/\s+/g, '_')}.png`);
  } catch (e: any) {
    console.error("Error triggering download:", e);
    error.value = "Could not trigger image download. Try right-clicking the image to save.";
  }
};

onMounted(() => {
  if (isAuthenticated.value && userId.value) {
    loadSavedImages();
  }
});

watch([isAuthenticated, userId], ([newIsAuth, newUserId], [oldIsAuth, oldUid]) => {
  if (newIsAuth && newUserId) {
    if (savedImages.value.length === 0 && !imagesLoading.value) { // Fetch if newly auth'd and no images
      loadSavedImages();
    }
  } else if (!newIsAuth) { // User logged out
    imageTitle.value = '';
    imageDescription.value = '';
    generatedImageUrl.value = null;
    promptUsedForGeneration.value = '';
    savedImages.value = [];
    clearMessages();
  }
});

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
.error-message { /* Consistent error styling */
    color: #721c24;
    background-color: #f8d7da;
    border-color: #f5c6cb;
    padding: .75rem 1.25rem;
    margin-bottom: 1rem;
    border: 1px solid transparent;
    border-radius: .25rem;
}
.note {
    font-size: 0.875rem;
    color: #6b7280; /* text-gray-500 */
}
</style>
