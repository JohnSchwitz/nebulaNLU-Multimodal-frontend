<template>
  <div class="create-picture-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- =================================================== -->
    <!-- 1. Authentication Status Display                  -->
    <!-- =================================================== -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Loading user information...
    </div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         <strong class="font-bold">Login Required:</strong> Please ensure you are logged in via Ghost to use image features.
       </span>
    </div>
     <div v-else-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         <strong class="font-bold">Auth Error:</strong> {{ authError }}
       </span>
     </div>
     <div v-else class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
       <span class="block sm:inline">
         <strong class="font-bold">User:</strong> {{ authUserName || userId }}. Ready to manage images.
       </span>
     </div>

     <!-- Loading spinner for actions -->
     <div v-if="isGenerating || isModifying || isSaving || imagesLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="spinner"></div>
       <p class="text-white ml-3 text-lg">Processing...</p>
     </div>

     <!-- Error/Success Messages -->
     <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
       <span class="block sm:inline">{{ error }}</span>
     </div>
     <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4">
       <span class="block sm:inline">{{ successMessage }}</span>
     </div>

    <!-- =================================================== -->
    <!-- Main Content Area (only if authenticated)        -->
    <!-- =================================================== -->
    <div v-if="isAuthenticated">
        <div class="mb-6">
            <h1 class="text-3xl font-bold mb-4 text-center">Create AI-Generated Images</h1>
            <p class="text-lg leading-relaxed text-center">
                Generate or modify images based on your descriptions.
            </p>
            <!-- Removed detailed instructions for brevity -->
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Generate or Modify Image</h2>

            <div class="mb-4">
                <label for="image-title" class="block text-lg mb-2">Image Title</label>
                <input
                type="text"
                id="image-title"
                v-model="imageTitle"
                placeholder="Enter a title for your image (optional but recommended)"
                class="w-full border rounded px-3 py-2"
                />
            </div>

            <div class="mb-4">
                <label for="image-description" class="block text-lg mb-2">Image Description / Base Prompt</label>
                <textarea
                id="image-description"
                v-model="imageDescription"
                placeholder="Describe the image you want to generate (minimum 10 characters)..."
                rows="6"
                class="w-full border rounded px-3 py-2"
                ></textarea>
            </div>

            <!-- Modification Input (Show only if an image is generated) -->
            <div v-if="generatedImageUrl" class="mb-4 mt-4 border-t pt-4">
                <label for="image-modifications" class="block text-lg mb-2">Modification Instructions (Optional)</label>
                <textarea
                id="image-modifications"
                v-model="modificationInstructions"
                placeholder="Describe changes to the *current* generated image (e.g., 'add sunglasses', 'make it night time')..."
                rows="3"
                class="w-full border rounded px-3 py-2"
                ></textarea>
            </div>

            <div class="flex justify-end gap-4 mt-4">
                 <button
                    v-if="generatedImageUrl"
                    @click="modifyImage"
                    :disabled="!modificationInstructions.trim() || isModifying || isGenerating"
                    class="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                    title="Apply changes based on modification instructions"
                    >
                    {{ isModifying ? 'Modifying...' : 'Apply Changes' }}
                </button>
                <button
                    @click="generateImage"
                    :disabled="!canGenerate || isGenerating || isModifying"
                    class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50"
                    :title="canGenerate ? 'Generate a new image based on the description' : 'Enter at least 10 characters in description'"
                    >
                    {{ isGenerating ? 'Generating...' : 'Generate New Image' }}
                </button>
            </div>
        </div>

        <!-- Generated Image Display -->
        <div v-if="generatedImageUrl && !isGenerating && !isModifying" class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Result</h2>
            <div class="flex flex-col items-center">
                <img
                :src="generatedImageUrl"
                :alt="imageTitle || 'Generated image'"
                class="max-w-full max-h-[500px] border rounded shadow-lg mb-4"
                />
                <div class="w-full flex justify-center gap-4 mt-4">
                <button
                    @click="downloadGeneratedImage"
                    class="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700"
                >
                    Download This Image
                </button>
                <button
                    @click="saveImage"
                    :disabled="isSaving"
                    class="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
                >
                    {{ isSaving ? 'Saving...' : 'Save to Gallery' }}
                </button>
                </div>
                 <!-- Modification History -->
                <div v-if="modificationHistory.length > 0" class="mt-6 w-full text-sm">
                    <h3 class="text-lg font-bold mb-2 text-center">Modifications Applied:</h3>
                    <ul class="list-disc pl-5 text-gray-600">
                    <li v-for="(mod, index) in modificationHistory" :key="index">{{ mod }}</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Gallery Section -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-2xl font-bold mb-4">Your Saved Image Gallery</h2>
             <div v-if="imagesLoading" class="text-center text-gray-500 py-4">Loading gallery...</div>
             <div v-else-if="savedImages.length === 0" class="text-center text-gray-500 py-4">Your saved images will appear here.</div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="image in savedImages" :key="image.image_id" class="border rounded p-2 text-center relative group">
                    <img
                        :src="image.access_url || '/placeholder-image.png'" <!-- Placeholder if URL fetch fails -->
                        :alt="image.image_title || 'Saved image'"
                        class="w-full h-32 object-cover mb-2 cursor-pointer"
                        @click="viewImage(image)"
                        @error="handleImageError" <!-- Handle broken image links -->
                    />
                    <p class="text-sm truncate font-semibold" :title="image.image_title || 'Untitled'">{{ image.image_title || 'Untitled' }}</p>
                     <p class="text-xs text-gray-500">{{ formatDate(image.created_at) }}</p>
                     <!-- Delete Button -->
                     <button
                         @click.stop="deleteSavedImage(image.image_id)"
                         class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Delete Image">
                         X
                     </button>
                </div>
            </div>
        </div>

        <!-- Add a modal for viewing larger image if needed -->

    </div> <!-- End v-if="isAuthenticated" -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/services/api'; // Use the correct path and 'api' object
import { useAuthStore } from '@/stores/auth'; // Use the correct path
import { storeToRefs } from 'pinia';
import { saveAs } from 'file-saver'; // For direct image download if needed

// --- Pinia Auth Store ---
const authStore = useAuthStore();
const {
    userId, // Use this from store
    isAuthenticated,
    isLoading: authIsLoading,
    error: authError,
    userName: authUserName
} = storeToRefs(authStore);

// --- Component State ---
const imageTitle = ref('');
const imageDescription = ref(''); // This is the base prompt for generation/modification
const modificationInstructions = ref('');
const generatedImageUrl = ref(null); // URL of the currently displayed generated/modified image
const visualDescriptionForSave = ref(''); // Store the visual description used for generation
const isGenerating = ref(false);
const isModifying = ref(false);
const isSaving = ref(false);
const imagesLoading = ref(false); // Loading state for the gallery
const error = ref(null); // Local component error
const successMessage = ref(null);
const savedImages = ref([]); // Array of { image_id, image_path, image_title, created_at, access_url? }
const modificationHistory = ref([]); // Track modification prompts for the current image


// --- Computed ---
const canGenerate = computed(() => imageDescription.value.trim().length >= 10);

// --- Methods ---
const clearMessages = () => {
    error.value = null;
    successMessage.value = null;
};

const formatDate = (dateInput) => { // Keep date formatting
    if (!dateInput) return 'N/A';
    try {
        const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(dateInput); }
};

const generateImage = async () => {
  if (!canGenerate.value || isGenerating.value || !isAuthenticated.value) return;
  isGenerating.value = true;
  clearMessages();
  generatedImageUrl.value = null; // Clear previous image
  modificationInstructions.value = ''; // Clear modification input
  modificationHistory.value = []; // Clear history

  try {
    // Use the Description field as the prompt for new generation
    const response = await api.generateImage(imageDescription.value);
    if (response.success && response.image_url) {
      generatedImageUrl.value = response.image_url;
      visualDescriptionForSave.value = response.visual_description || imageDescription.value; // Store prompt used
      successMessage.value = 'Image generated successfully!';
    } else {
      throw new Error(response.message || response.error || 'Failed to generate image');
    }
  } catch (err) {
    console.error('API Error generating image:', err);
    error.value = err.message || 'Failed to generate image';
  } finally {
    isGenerating.value = false;
  }
};

const modifyImage = async () => {
  // Use current imageDescription as base, add modification instructions
  if (!modificationInstructions.value.trim() || isModifying.value || !isAuthenticated.value) return;
  isModifying.value = true;
  clearMessages();

  try {
    // Pass the *current* description (which might itself be a result of previous modifications)
    // and the new instructions
    const response = await api.modifyImage(
      visualDescriptionForSave.value || imageDescription.value, // Use last known visual desc
      modificationInstructions.value
    );

    if (response.success && response.image_url) {
      generatedImageUrl.value = response.image_url; // Update displayed image
      visualDescriptionForSave.value = response.visual_description; // Update the description for saving/next mod
      modificationHistory.value.push(modificationInstructions.value); // Add to history
      modificationInstructions.value = ''; // Clear input
      successMessage.value = 'Image modified successfully!';
    } else {
      throw new Error(response.message || response.error || 'Failed to modify image');
    }
  } catch (err) {
    console.error('API Error modifying image:', err);
    error.value = err.message || 'Failed to modify image';
  } finally {
    isModifying.value = false;
  }
};

const saveImage = async () => {
  if (!generatedImageUrl.value || isSaving.value || !isAuthenticated.value) return;
  isSaving.value = true;
  clearMessages();

  try {
    const imageData = {
      image_url: generatedImageUrl.value,
      // *** MODIFICATION: REMOVE user_id - backend gets it from token ***
      image_title: imageTitle.value.trim() || 'Untitled Image',
      image_description: visualDescriptionForSave.value || imageDescription.value // Save the prompt/desc used
    };
    const response = await api.saveImage(imageData); // API call doesn't need userId

    if (response.success && response.image_id) {
      successMessage.value = 'Image saved to your gallery!';
      // Optionally clear the generated image after saving
      // generatedImageUrl.value = null;
      // imageTitle.value = '';
      // imageDescription.value = '';
      // modificationHistory.value = [];
      // visualDescriptionForSave.value = '';

      // Refresh the gallery
      await loadSavedImages();
    } else {
      throw new Error(response.message || response.error || 'Failed to save image');
    }
  } catch (err) {
    console.error('API Error saving image:', err);
    error.value = err.message || 'Failed to save image';
  } finally {
    isSaving.value = false;
  }
};

const loadSavedImages = async () => {
    if (!isAuthenticated.value) {
        console.warn("loadSavedImages: User not authenticated.");
        savedImages.value = [];
        return;
    }
    imagesLoading.value = true;
    clearMessages(); // Clear messages when reloading gallery
    try {
        // *** MODIFICATION: Call API without userId ***
        const imagesData = await api.getUserImages();
        // Fetch signed URLs for each image in parallel
        const imagesWithUrls = await Promise.all(imagesData.map(async (img) => {
            let access_url = null;
            if (img.image_id) { // Only try if ID exists
                try {
                    access_url = await api.getImageDownloadUrl(img.image_id);
                } catch (urlError) {
                    console.error(`Failed to get signed URL for image ${img.image_id}`, urlError);
                }
            }
            return { ...img, access_url }; // Add access_url to the object
        }));
        savedImages.value = imagesWithUrls;
    } catch (err) {
        console.error('Error loading saved images:', err);
        error.value = err.message || "Failed to load image gallery.";
        savedImages.value = []; // Clear on error
    } finally {
        imagesLoading.value = false;
    }
};

// Function to handle image loading errors in the gallery
const handleImageError = (event) => {
    console.warn("Image failed to load:", event.target.src);
    // Optionally replace with a placeholder
    event.target.src = '/placeholder-image-error.png'; // Make sure you have this placeholder
};

// Function to view image (e.g., open in modal or new tab)
const viewImage = (image) => {
    if (image.access_url) {
        window.open(image.access_url, '_blank');
    } else {
        alert('Could not load image preview.');
    }
};

// Function to delete an image
const deleteSavedImage = async (imageId) => {
    if (!isAuthenticated.value) { error.value = "Authentication required to delete."; return; }
    if (!imageId) return;

    const confirmed = window.confirm("Are you sure you want to delete this image? This cannot be undone.");
    if (!confirmed) return;

    clearMessages();
    imagesLoading.value = true; // Show loading indicator while deleting/refreshing

    try {
        const success = await api.deleteImage(imageId); // API handles auth via interceptor
        if (success) {
            successMessage.value = "Image deleted successfully.";
            // Refresh the gallery optimistically or after confirmation
            // savedImages.value = savedImages.value.filter(img => img.image_id !== imageId); // Optimistic UI update
            await loadSavedImages(); // Refresh from backend
        } else {
            throw new Error("Failed to delete image on the server.");
        }
    } catch (err) {
        console.error(`Error deleting image ${imageId}:`, err);
        error.value = err.message || "Failed to delete image.";
    } finally {
         imagesLoading.value = false;
    }
};


// Function to download the *currently displayed* generated image
const downloadGeneratedImage = () => {
  if (!generatedImageUrl.value) return;
  try {
    saveAs(generatedImageUrl.value, `${imageTitle.value.replace(/[^a-z0-9]/gi, '_') || 'generated-image'}.png`);
    // Note: saveAs might be blocked by browser for cross-origin URLs unless CORS headers are right
    // on the source (OpenAI). A backend proxy might be needed for reliable direct download.
    // Generating a signed URL via the backend and using that for saveAs might be more reliable.
  } catch (e) {
      console.error("Error triggering download:", e);
      error.value = "Could not trigger image download. Try right-clicking the image to save.";
  }
};

// --- Lifecycle Hooks & Watchers ---
onMounted(() => {
    if (isAuthenticated.value) {
        loadSavedImages();
    }
});

watch(isAuthenticated, (isAuth, wasAuth) => {
    if (isAuth === true && wasAuth === false) {
        loadSavedImages();
    }
     if (isAuth === false && wasAuth === true) {
         // Clear component state on logout
         imageTitle.value = '';
         imageDescription.value = '';
         modificationInstructions.value = '';
         generatedImageUrl.value = null;
         visualDescriptionForSave.value = '';
         savedImages.value = [];
         modificationHistory.value = [];
         clearMessages();
     }
});

</script>

<style scoped>
/* ... (spinner styles remain the same) ... */
.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.group:hover .opacity-0 {
    opacity: 1;
}
</style>
