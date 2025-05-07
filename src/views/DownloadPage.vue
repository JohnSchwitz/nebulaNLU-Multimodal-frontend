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
      <!-- Optional: Add a link/button back to Ghost sign-in -->
    </div>
    <div v-else-if="authError" class="error-message">
       <p>Authentication error: {{ authError }}</p>
    </div>

    <!-- Main content shown only when authenticated and auth check done -->
    <div v-else>
        <div v-if="isLoading" class="loading-indicator">
        <p>Loading your data for user ID: {{ userId }}...</p>
        <!-- Add a spinner or visual indicator here -->
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

            <!-- Narratives Section -->
            <section class="download-section">
                <h2>Narratives ({{ narratives.length }})</h2>
                <ul v-if="narratives.length > 0">
                <li v-for="narrative in narratives" :key="narrative.narrative_id">
                    <input
                    type="checkbox"
                    :id="'narrative-' + narrative.narrative_id"
                    :value="narrative.narrative_id"
                    v-model="selectedNarrativeIds"
                    />
                    <label :for="'narrative-' + narrative.narrative_id">{{ narrative.narrative_name }}</label>
                    <button @click="downloadNarrativePdf(narrative)" class="btn-download-item">Download PDF</button>
                </li>
                </ul>
                <p v-else>No narratives found.</p>
            </section>

            <!-- Images Section -->
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
import apiService from '@/api'; // Adjust path as needed
import { saveAs } from 'file-saver'; // npm install file-saver
// *** START MODIFICATION: Import Pinia Store ***
import { useAuthStore } from '@/stores/auth'; // <-- Adjust path to your auth store
import { storeToRefs } from 'pinia';
// *** END MODIFICATION ***

// --- State ---
const stories = ref([]);
const narratives = ref([]);
const images = ref([]);

const selectedStoryIds = ref([]);
const selectedNarrativeIds = ref([]);
const selectedImageIds = ref([]);

const isLoading = ref(true); // For data fetching state
const error = ref(null);     // For data fetching errors
const isDownloading = ref(false);
const isFetchingSignedUrl = ref(null);

// --- Pinia Auth Store ---
const authStore = useAuthStore();
// Make state properties reactive using storeToRefs
const {
    userId, // <-- Use this for user context
    // userStatus: authUserStatus, // Keep if needed for display/logic
    // userName: authUserName,    // Keep if needed for display/logic
    error: authError,
    isLoading: authIsLoading, // Use this for initial auth check state
    isAuthenticated // Use this getter for conditional rendering
} = storeToRefs(authStore);
// ------------------------

// --- Computed ---
const hasSelection = computed(() => {
  return selectedStoryIds.value.length > 0 ||
         selectedNarrativeIds.value.length > 0 ||
         selectedImageIds.value.length > 0;
});

// --- Methods ---
const fetchData = async () => {
  // *** START MODIFICATION: Check userId from store ***
  // We rely on the isAuthenticated getter now for the main conditional render,
  // but we log the userId we're using. The actual user is identified
  // by the auth token sent by apiService.
  if (!userId.value) {
      console.warn("FetchData called but userId from authStore is not available yet.");
      // Error handling might be done based on isAuthenticated instead
      // error.value = "User identifier not found in auth state.";
      // isLoading.value = false;
      return; // Wait for auth state to be ready (handled by watch or v-if)
  }
  // *** END MODIFICATION ***

  console.log(`Fetching data for user ID (from store): ${userId.value}`); // Log which user we think we are
  isLoading.value = true;
  error.value = null;

  try {
    // Calls remain the same - apiService handles sending the necessary auth token
    const [storiesRes, narrativesRes, imagesRes] = await Promise.all([
      apiService.getUserStories(),
      apiService.getUserNarratives(),
      apiService.getUserImages()
    ]);

    stories.value = Array.isArray(storiesRes) ? storiesRes : [];
    narratives.value = Array.isArray(narrativesRes) ? narrativesRes : [];
    images.value = Array.isArray(imagesRes) ? imagesRes.map(img => ({ ...img, downloadUrl: null })) : [];

  } catch (err) {
    console.error("Error fetching user data:", err);
    error.value = err.message || 'Failed to load data from the server.';
     if (err.response?.status === 401) {
        error.value = "Authentication failed. Please log in again via Ghost.";
        // Optionally trigger authStore.logout() or redirect
    }
  } finally {
    isLoading.value = false;
  }
};

// --- Individual Download Functions (No changes needed here, they use API service) ---

const downloadStoryPdf = async (story) => {
    if (!story?.story_id || !story?.story_content) { alert('Invalid story data.'); return; }
    console.log(`Requesting PDF for story: ${story.story_name}`);
    try {
        const blob = await apiService.getStoryPdf(story.story_name, story.story_content);
        saveAs(blob, `${story.story_name.replace(/[^a-z0-9]/gi, '_') || 'story'}.pdf`);
    } catch (err) {
        console.error(`Error downloading story PDF (${story.story_id}):`, err);
        alert(`Failed to download PDF for "${story.story_name}": ${err.message}`);
    }
};

const downloadNarrativePdf = async (narrative) => {
     if (!narrative?.narrative_id || !narrative?.narrative_content) { alert('Invalid narrative data.'); return; }
     console.log(`Requesting PDF for narrative: ${narrative.narrative_name}`);
     try {
        const blob = await apiService.getNarrativePdf(narrative.narrative_name, narrative.narrative_content, narrative.source_stories);
        saveAs(blob, `${narrative.narrative_name.replace(/[^a-z0-9]/gi, '_') || 'narrative'}.pdf`);
    } catch (err) {
        console.error(`Error downloading narrative PDF (${narrative.narrative_id}):`, err);
        alert(`Failed to download PDF for "${narrative.narrative_name}": ${err.message}`);
    }
};

const downloadImage = async (image) => {
    if (!image?.image_id || !image?.image_path) { alert('Invalid image data.'); return; }
    console.log(`Requesting download URL for image: ${image.image_title} (ID: ${image.image_id})`);
    isFetchingSignedUrl.value = image.image_id;
    try {
        const signedUrl = await apiService.getImageDownloadUrl(image.image_id); // API service sends auth
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

// --- Bulk Download (Placeholder - No changes needed here) ---
const handleBulkDownload = () => {
  // ... (implementation remains a placeholder) ...
   alert("Bulk download is not yet implemented. Please use the individual download buttons/links for now.");
};

// --- Lifecycle Hooks ---
onMounted(() => {
  // *** START MODIFICATION: Fetch data only if authenticated ***
  // Initial check
  if (isAuthenticated.value) {
      console.log("DownloadPage: User is authenticated on mount. Fetching data.");
      fetchData();
  } else {
      console.log("DownloadPage: User is not authenticated on mount. Waiting for auth state.");
      isLoading.value = false; // Stop data loading indicator, show auth message instead
  }
  // *** END MODIFICATION ***
});

// *** START MODIFICATION: Watch for authentication changes ***
// If the user logs in *after* the component mounts, fetch data then.
watch(isAuthenticated, (newValue, oldValue) => {
  if (newValue === true && oldValue === false) {
    console.log("DownloadPage: User became authenticated after mount. Fetching data.");
    fetchData();
  }
  // Optional: Handle logout while on the page
  if(newValue === false && oldValue === true) {
      console.log("DownloadPage: User logged out.");
      // Clear data
      stories.value = [];
      narratives.value = [];
      images.value = [];
      selectedStoryIds.value = [];
      selectedNarrativeIds.value = [];
      selectedImageIds.value = [];
      error.value = null; // Clear previous errors
  }
});
// *** END MODIFICATION ***

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
