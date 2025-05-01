<!-- views/CreatePicture.vue - Updated with modification support -->
<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-4">Create AI-Generated Images</h1>
      <p class="text-lg leading-relaxed">
        Create images based on your descriptions using AI. You can generate images from your stories or create standalone artwork.
        <br><br>
        Provide a detailed description of what you want to see in your image. Include details about:
      </p>
      <ul class="list-disc pl-6 mt-2">
        <li>Characters (appearance, clothing, facial features)</li>
        <li>Setting and environment</li>
        <li>Colors, lighting, and mood</li>
        <li>Style (realistic, cartoon, painting, etc.)</li>
      </ul>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-2xl font-bold mb-4">Create an Image</h2>

      <div class="mb-4">
        <label for="image-title" class="block text-lg mb-2">Image Title</label>
        <input
          type="text"
          id="image-title"
          v-model="imageTitle"
          placeholder="Enter a title for your image"
          class="w-full border rounded px-3 py-2"
        />
      </div>

      <div class="mb-4">
        <label for="image-description" class="block text-lg mb-2">Image Description</label>
        <textarea
          id="image-description"
          v-model="imageDescription"
          placeholder="Describe in detail what you want to see in your image..."
          rows="6"
          class="w-full border rounded px-3 py-2"
        ></textarea>
      </div>

      <div class="text-right">
        <button
          @click="generateImage"
          :disabled="!canGenerate || isGenerating"
          class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isGenerating ? 'Generating...' : 'Generate Image' }}
        </button>
      </div>
    </div>

    <!-- Generated Image Display -->
    <div v-if="generatedImage || isGenerating" class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-2xl font-bold mb-4">Generated Image</h2>

      <div v-if="isGenerating" class="text-center py-10">
        <div class="spinner mx-auto"></div>
        <p class="mt-4">Creating your image... this may take up to 30 seconds</p>
      </div>

      <div v-else-if="generatedImage" class="flex flex-col items-center">
        <img
          :src="generatedImage"
          :alt="imageTitle || 'Generated image'"
          class="max-w-full max-h-[500px] border rounded shadow-lg mb-4"
        />

        <div class="w-full flex justify-between mt-4">
          <button
            @click="downloadImage"
            class="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-gray-700"
          >
            Download Image
          </button>
          <button
            @click="saveImage"
            :disabled="isSaving"
            class="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Saving...' : 'Save to Gallery' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modify Image Section - NEW -->
    <div v-if="generatedImage && !isGenerating" class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-2xl font-bold mb-4">Modify Your Image</h2>

      <div class="mb-4">
        <label for="image-modifications" class="block text-lg mb-2">Modification Instructions</label>
        <textarea
          id="image-modifications"
          v-model="modificationInstructions"
          placeholder="Describe changes you'd like to make to the image. For example: 'Make the sky more blue', 'Add a cat in the foreground', 'Change the lighting to sunset'"
          rows="4"
          class="w-full border rounded px-3 py-2"
        ></textarea>
      </div>

      <div class="text-right">
        <button
          @click="modifyImage"
          :disabled="!modificationInstructions.trim() || isModifying"
          class="bg-gray-800 text-white px-6 py-3 rounded font-bold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isModifying ? 'Modifying...' : 'Apply Changes' }}
        </button>
      </div>

      <!-- Modification History -->
      <div v-if="modificationHistory.length > 0" class="mt-6">
        <h3 class="text-xl font-bold mb-2">Modification History</h3>
        <div class="space-y-2 mt-3">
          <div v-for="(mod, index) in modificationHistory" :key="index" class="p-2 bg-gray-100 rounded">
            <p class="text-sm"><strong>Modified:</strong> {{ mod.instructions }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Gallery Section -->
    <div v-if="savedImages.length > 0" class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-2xl font-bold mb-4">Your Image Gallery</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(image, index) in savedImages" :key="index" class="border rounded p-2 bg-white">
          <img
            :src="image.url"
            :alt="image.title"
            class="w-full h-40 object-cover mb-2"
          />
          <p class="text-center truncate">{{ image.title }}</p>
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
      <span class="block sm:inline">{{ error }}</span>
    </div>

    <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4">
      <span class="block sm:inline">{{ successMessage }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import api from '@/services/api';

export default defineComponent({
  name: 'CreatePicture',
  setup() {
    const imageTitle = ref('');
    const imageDescription = ref('');
    const modificationInstructions = ref('');
    const generatedImage = ref<string | null>(null);
    const visualDescription = ref('');
    const isGenerating = ref(false);
    const isModifying = ref(false);
    const isSaving = ref(false);
    const error = ref('');
    const successMessage = ref('');
    const user_id = ref(1); // Default user ID
    const savedImages = ref<any[]>([]);
    const currentImageId = ref<number | null>(null);
    const modificationHistory = ref<{instructions: string, date: Date}[]>([]);

    const canGenerate = computed(() => {
      return imageDescription.value.trim().length >= 10;
    });

    onMounted(() => {
      loadSavedImages();
    });

    async function generateImage() {
      if (!canGenerate.value || isGenerating.value) return;

      isGenerating.value = true;
      error.value = '';
      successMessage.value = '';

      try {
        const response = await api.generateImage(imageDescription.value);

        if (response.success) {
          generatedImage.value = response.image_url;
          visualDescription.value = response.visual_description;
          successMessage.value = 'Image generated successfully!';

          // Reset modification history when generating a new image
          modificationHistory.value = [];
        } else {
          throw new Error(response.message || 'Failed to generate image');
        }
      } catch (err: any) {
        console.error('API Error:', err);
        error.value = err.message || 'Failed to generate image';
      } finally {
        isGenerating.value = false;
      }
    }

    async function modifyImage() {
      if (!modificationInstructions.value.trim() || isModifying.value) return;

      isModifying.value = true;
      error.value = '';
      successMessage.value = '';

      try {
        const response = await api.modifyImage(
          imageDescription.value,
          modificationInstructions.value
        );

        if (response.success) {
          // Update the current image
          generatedImage.value = response.image_url;

          // Add to modification history
          modificationHistory.value.push({
            instructions: modificationInstructions.value,
            date: new Date()
          });

          // Update the description to include the modifications for future changes
          imageDescription.value = response.visual_description;

          // Reset the modification input
          modificationInstructions.value = '';

          successMessage.value = 'Image modified successfully!';
        } else {
          throw new Error(response.message || 'Failed to modify image');
        }
      } catch (err: any) {
        console.error('API Error:', err);
        error.value = err.message || 'Failed to modify image';
      } finally {
        isModifying.value = false;
      }
    }

    async function saveImage() {
      if (!generatedImage.value || isSaving.value) return;

      isSaving.value = true;
      error.value = '';

      try {
        const response = await api.saveImage({
          image_url: generatedImage.value,
          user_id: user_id.value,
          image_title: imageTitle.value || 'Untitled Image',
          image_description: imageDescription.value
        });

        if (response.success) {
          currentImageId.value = response.image_id;
          successMessage.value = 'Image saved to your gallery!';

          // Add to saved images
          savedImages.value.unshift({
            id: response.image_id,
            url: response.local_path ? `${import.meta.env.VITE_API_URL}${response.local_path}` : generatedImage.value,
            title: imageTitle.value || 'Untitled Image'
          });
        } else {
          throw new Error(response.message || 'Failed to save image');
        }
      } catch (err: any) {
        console.error('API Error:', err);
        error.value = err.message || 'Failed to save image';
      } finally {
        isSaving.value = false;
      }
    }

    async function loadSavedImages() {
      try {
        const images = await api.getUserImages(user_id.value);

        if (Array.isArray(images)) {
          savedImages.value = images.map(image => ({
            id: image.image_id,
            url: `${import.meta.env.VITE_API_URL}${image.image_path}`,
            title: image.image_title
          }));
        }
      } catch (err) {
        console.error('Error loading saved images:', err);
      }
    }

    function downloadImage() {
      if (!generatedImage.value) return;

      // Create a link to download the image
      const link = document.createElement('a');
      link.href = generatedImage.value;
      link.download = `${imageTitle.value || 'generated-image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function resetForm() {
      imageTitle.value = '';
      imageDescription.value = '';
      modificationInstructions.value = '';
      generatedImage.value = null;
      visualDescription.value = '';
      error.value = '';
      successMessage.value = '';
      currentImageId.value = null;
      modificationHistory.value = [];
    }

    return {
      imageTitle,
      imageDescription,
      modificationInstructions,
      generatedImage,
      visualDescription,
      isGenerating,
      isModifying,
      isSaving,
      error,
      successMessage,
      user_id,
      savedImages,
      currentImageId,
      modificationHistory,
      canGenerate,
      generateImage,
      modifyImage,
      saveImage,
      loadSavedImages,
      downloadImage,
      resetForm
    };
  }
});
</script>

<style scoped>
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
</style>
