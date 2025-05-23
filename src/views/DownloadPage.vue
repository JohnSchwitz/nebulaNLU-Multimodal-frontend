<!-- DownloadPage.vue -->
<template>
  <div class="download-page container">
    <h1>Download Your Content</h1>

    <!-- Display loading/error based on auth state FIRST -->
    <div v-if="authIsLoading" class="loading-indicator">
      <p>Checking authentication...</p>
    </div>
    <div v-else-if="!isAuthenticated" class="error-message">
      <p>Please log in via Ghost to access this page.</p>

    </div>
    <div v-else-if="authError" class="error-message">
       <p>Authentication error: {{ authError }}</p>
    </div>

    <!-- Main content shown only when authenticated and auth check done -->

    <div v-else>
        <div v-if="isLoading" class="loading-indicator">
        <p>Loading your data for user ID: {{ userId }}...</p>
        </div>

        <div v-if="error" class="error-message">
        <p>Error loading data: {{ error }}</p>
        </div>

        <div v-if="!isLoading && !error">
            <p>Select the items you wish to download and click the 'Download Selected' button.</p>
            <p>Note: Currently, images need to be downloaded individually via provided links (if available) or require future backend support for bulk/direct download.</p>

            <!-- Stories Section -->

            <section class="download-section">
                <h2>Stories ({{ stories.length }})</h2>
                <ul v-if="stories.length > 0">
                <li v-for="story in stories" :key="story.story_id">
                    <input
                    type="checkbox"
                    :id="'story-' + story.story_id"
                    :value="story.story_id"
                    v-model="selectedStoryIds"
                    />
                    <label :for="'story-' + story.story_id">{{ story.story_name }}</label>
                    <button @click="downloadStoryPdf(story)" class="btn-download-item">Download PDF</button>
                </li>
                </ul>
                <p v-else>No stories found.</p>
            </section>

            <!-- Images Section -->
<!--
            <section class="download-section">
                <h2>Images ({{ images.length }})</h2>
                <p class="note">Image download requires backend support for Signed URLs or direct download.</p>
                <ul v-if="images.length > 0">
                <li v-for="image in images" :key="image.image_id">
                    <input
                    type="checkbox"
                    :id="'image-' + image.image_id"
                    :value="image.image_id"
                    v-model="selectedImageIds"
                    />
                    <label :for="'image-' + image.image_id">
                    {{ image.image_title || 'Untitled Image' }}
                    <em v-if="image.image_description"> - {{ image.image_description.substring(0, 50) }}...</em>
                    <span class="gcs-path"> (Path: {{ image.image_path }})</span>
                    </label>
                    <button @click="downloadImage(image)" class="btn-download-item" :disabled="isFetchingSignedUrl === image.image_id">
                    {{ isFetchingSignedUrl === image.image_id ? 'Getting Link...' : 'Get Download Link' }}
                    </button>
                    <a v-if="image.downloadUrl" :href="image.downloadUrl" target="_blank" rel="noopener noreferrer" class="download-link">Direct Link</a>
                </li>
                </ul>
                <p v-else>No images found.</p>
            </section>
-->
            <!-- Download Button -->

            <div class="download-actions">
                <button
                    @click="handleBulkDownload"
                    :disabled="!hasSelection || isDownloading"
                    class="btn-primary"
                >
                {{ isDownloading ? 'Downloading...' : 'Download Selected (Not Implemented)' }}
                </button>
                <p v-if="!hasSelection" class="note">Please select items to download.</p>
                <p class="note">Bulk download currently not supported. Please use individual download buttons.</p>
            </div>

        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import { saveAs } from 'file-saver';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';

// --- State ---
const stories = ref([]);
const narratives = ref([]);
const images = ref([]);
const selectedStoryIds = ref([]);
const selectedNarrativeIds = ref([]);
const selectedImageIds = ref([]);
const isLoading = ref(true);
const error = ref(null);
const isDownloading = ref(false);
const isFetchingSignedUrl = ref(null);

// --- Pinia Auth Store ---
const authStore = useAuthStore();
const {
    userId,
    error: authError,
    isLoading: authIsLoading,
    isAuthenticated
} = storeToRefs(authStore);

// --- Computed ---
const hasSelection = computed(() => {
  return selectedStoryIds.value.length > 0 ||
         selectedNarrativeIds.value.length > 0 ||
         selectedImageIds.value.length > 0;
});

// --- Methods ---
const fetchData = async () => {
  if (!userId.value && isAuthenticated.value) { // Check if authenticated but ID is missing somehow
      console.warn("FetchData: User authenticated but userId from store is missing.");
      // Maybe fetch user profile first? Or rely on token alone if backend allows
  }
  if (!isAuthenticated.value) { // Don't fetch if not authenticated
       return;
  }

  console.log(`Fetching data for user associated with current token...`);
  isLoading.value = true;
  error.value = null;

  try {
  if (!isAuthenticated.value || !userId.value) {
      logger.warn("DownloadPage: User not authenticated or userId missing, cannot fetch data.");
      error.value = "User not authenticated. Please log in.";
      isLoading.value = false; // Stop loading indicator
      return; // Exit early
  }

  // Now we know userId.value is available
  const currentUserId = userId.value; // Use a local const for clarity in Promise.all

  logger.info(`[DownloadPage] Fetching data for user ID: ${currentUserId}`);
  const [storiesRes, narrativesRes, imagesRes] = await Promise.all([
    api.getUserStories(currentUserId),      // Pass userId.value
    api.getUserNarratives(currentUserId),   // Pass userId.value
    api.getUserImages(currentUserId)        // Pass userId.value
  ]);
    stories.value = Array.isArray(storiesRes) ? storiesRes : [];
    narratives.value = Array.isArray(narrativesRes) ? narrativesRes : [];
    images.value = Array.isArray(imagesRes) ? imagesRes.map(img => ({ ...img, downloadUrl: null })) : [];
  } catch (err) {
    console.error("Error fetching user data:", err);
    error.value = err.message || 'Failed to load data from the server.';
     if (err.response?.status === 401) {
        error.value = "Authentication failed. Please log in again via Ghost.";
    }
  } finally {
    isLoading.value = false;
  }
};

const downloadStoryPdf = async (story) => {
    if (!story?.story_id || !story?.story_content) { alert('Invalid story data.'); return; }
    console.log(`Requesting PDF for story: ${story.story_name}`);
    try {
      if (!userId.value) {
          alert('User session error. Please try logging in again.');
          return;
      }

      const pdfData = {
        story_name: story.story_name,
        story_content: story.story_content,
        user_id: userId.value // Pass the user_id
      };
      const blob = await api.generateStoryPDF(pdfData);

    } catch (err) {
        console.error(`Error downloading story PDF (${story.story_id}):`, err);
        alert(`Failed to download PDF for "${story.story_name}": ${err.message}`);
    }
};

const downloadImage = async (image) => {
    if (!image?.image_id || !image?.image_path) { alert('Invalid image data.'); return; }
    console.log(`Requesting download URL for image: ${image.image_title} (ID: ${image.image_id})`);
    isFetchingSignedUrl.value = image.image_id;
    try {
        // *** FIX: Use 'api' instead of 'apiService' ***
        const signedUrl = await api.getImageDownloadUrl(image.image_id);
        if (signedUrl) {
            const imgIndex = images.value.findIndex(img => img.image_id === image.image_id);
            if (imgIndex > -1) images.value[imgIndex].downloadUrl = signedUrl;
            console.log(`Obtained Signed URL for ${image.image_id}`);
        } else { throw new Error("Backend did not return a valid download URL."); }
    } catch (err) {
        console.error(`Error getting download URL for image ${image.image_id}:`, err);
        alert(`Failed to get download link for "${image.image_title}": ${err.message}.`);
         const imgIndex = images.value.findIndex(img => img.image_id === image.image_id);
         if (imgIndex > -1) images.value[imgIndex].downloadUrl = null;
    } finally {
        isFetchingSignedUrl.value = null;
    }
};

const handleBulkDownload = () => {
   alert("Bulk download is not yet implemented.");
};

// --- Lifecycle Hooks ---
onMounted(() => {
  if (isAuthenticated.value) {
      fetchData();
  } else {
      isLoading.value = false;
  }
});

watch(isAuthenticated, (newValue, oldValue) => {
  if (newValue === true && oldValue === false) {
    fetchData();
  }
  if(newValue === false && oldValue === true) {
      stories.value = []; narratives.value = []; images.value = [];
      selectedStoryIds.value = []; selectedNarrativeIds.value = []; selectedImageIds.value = [];
      error.value = null;
  }
});

</script>

<style scoped>
/* ... (styles remain the same) ... */
.container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
}

.loading-indicator, .error-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.1em;
}
.error-message {
  color: #dc3545;
  border: 1px solid #f5c6cb;
  background-color: #f8d7da;
  border-radius: 5px;
}

.download-section {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 5px;
}

.download-section h2 {
  margin-top: 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px dashed #eee;
}
li:last-child {
    border-bottom: none;
}

input[type="checkbox"] {
  margin-right: 0.75rem;
  transform: scale(1.2);
  accent-color: #007bff;
}

label {
  flex-grow: 1;
  cursor: pointer;
}

.gcs-path {
    font-size: 0.8em;
    color: #6c757d;
    margin-left: 5px;
}

.btn-download-item {
    margin-left: 1rem;
    padding: 3px 8px;
    font-size: 0.85em;
    cursor: pointer;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 3px;
    color: #212529;
}
.btn-download-item:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}
.download-link {
    margin-left: 0.5rem;
    font-size: 0.85em;
}


.download-actions {
  margin-top: 2rem;
  text-align: center;
}

.btn-primary {
  padding: 10px 20px;
  font-size: 1.1em;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
}

.btn-primary:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.note {
    font-size: 0.9em;
    color: #6c757d;
    margin-top: 0.5rem;
}
</style>
