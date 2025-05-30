<!-- DownloadPage.vue -->
<template>
  <div class="download-page-container container mx-auto p-4 md:p-6"> <!-- Added mx-auto and specific container class -->
    <h1 class="download-page-title text-center mb-6">Download Your Saved Stories</h1> <!-- Added class for title -->

    <!-- Auth Status (keep existing logic) -->
    <div v-if="authIsLoading" class="loading-indicator"><p>Checking authentication...</p></div>
    <div v-else-if="!isAuthenticated" class="error-message"><p>Please log in to access this page.</p></div>
    <div v-else-if="authError" class="error-message"><p>Auth Error: {{ authError }}</p></div>

    <div v-else>
        <div v-if="isLoadingStories" class="loading-indicator">
            <p>Loading your stories for user ID: {{ userId }}...</p>
        </div>
        <div v-if="storiesError" class="error-message"><p>Error loading stories: {{ storiesError }}</p></div>

        <div v-if="!isLoadingStories && !storiesError">
            <!-- This is the main box for the story list -->
            <section class="stories-list-box download-section rounded-md shadow-md p-4 md:p-6"
                     :style="{ backgroundColor: '#FFE086', color: 'black' }">
                <h2 class="stories-list-title mb-4">My Stories ({{ stories.length }})</h2>
                <ul v-if="stories.length > 0" class="list-none p-0">
                    <li v-for="story in stories" :key="story.story_id || story.session_id"
                        class="story-item flex justify-between items-center py-3 border-b border-gray-700 last:border-b-0">
                        <span class="story-name">{{ story.name || `Story - ${formatDate(story.created_at)}` }}</span>
                        <button @click="downloadStoryAsPdf(story)"
                                class="btn-download-item bg-blue-600 hover:bg-blue-700 text-white">
                            Download PDF
                        </button>
                    </li>
                </ul>
                <p v-else class="story-item-text">No stories found.</p> <!-- Apply story-item-text style -->
            </section>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import api from '@/services/api';
import { saveAs } from 'file-saver'; // For PDF download
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';

interface StoryListItem { // Type for items from /api/user/stories
  story_id: string;
  name: string;
  content?: string; // Full content might not be in the list view
  created_at: string | Date;
  // Add other fields returned by your /api/user/stories
}

const stories = ref<StoryListItem[]>([]);
const isLoadingStories = ref(true);
const storiesError = ref<string | null>(null);

const authStore = useAuthStore();
const { userId, isAuthenticated, isLoading: authIsLoading, error: authError } = storeToRefs(authStore);

const formatDate = (dateInput: string | Date | undefined): string => { /* ... same as before ... */ };

async function fetchUserStories() {
  if (!isAuthenticated.value) {
    storiesError.value = "Not authenticated."; isLoadingStories.value = false; return;
  }
  if (!userId.value || typeof userId.value !== 'string') {
    storiesError.value = "User ID not available."; isLoadingStories.value = false; return;
  }

  isLoadingStories.value = true;
  storiesError.value = null;
  console.log(`[DownloadPage] Fetching stories for user ID: ${userId.value}`);
  try {
    const storiesData = await api.getUserStories(userId.value);
    stories.value = Array.isArray(storiesData) ? storiesData : [];
  } catch (e: any) {
    storiesError.value = e.message || 'Failed to load stories.';
  } finally {
    isLoadingStories.value = false;
  }
}

const downloadStoryAsPdf = async (story: StoryListItem) => {

  // Assuming for now 'story.content' IS available or you'll fetch it:
  const storyName = story.name || 'Untitled_Story';
  const storyContent = story.content;

  if (!storyContent) {
    alert('Full story content is not available for this item to generate PDF. This might require fetching the full story details first.');
    storiesError.value = `Full content for "${storyName}" not loaded.`;
    return;
  }
   if (!userId.value) { alert('User session error.'); return; }

  console.log(`[DownloadPage] Requesting PDF for story: ${storyName}`);
  // (Optional: set a specific PDF downloading loading state)
  try {
    const pdfData = {
      story_name: storyName,
      story_content: storyContent,
      user_id: userId.value
    };
    const blob = await api.generateStoryPDF(pdfData);
    saveAs(blob, `${storyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  } catch (err: any) {
    storiesError.value = `Failed to download PDF for "${storyName}": ${err.message}`;
  } finally {
    // (Optional: clear specific PDF downloading loading state)
  }
};

onMounted(() => {
  if (isAuthenticated.value && userId.value) {
    fetchUserStories();
  }
});

watch([isAuthenticated, userId], ([newIsAuth, newUserId]) => {
  if (newIsAuth && newUserId) {
    if (stories.value.length === 0 && !isLoadingStories.value) {
      fetchUserStories();
    }
  } else if (!newIsAuth) {
    stories.value = [];
    storiesError.value = null;
  }
}, { immediate: false });
</script>

<style scoped>
/* General page container styling if needed */
.download-page-container {
  font-family: 'Georgia', serif; /* Or your preferred page font */
}

.download-page-title {
  font-size: 2rem;    /* Example: Larger size for the main page title */
  font-weight: bold;  /* Bold the title */
  color: #1f2937;   /* Dark gray, Tailwind text-gray-800 */
}

.stories-list-box {
  /* Background color is set by inline style :style="{ backgroundColor: '#FFE086' }" */
  /* color: black; /* Also set by inline style */
  /* Add any other box-specific styles like padding if not handled by Tailwind */
}

.stories-list-title {
  font-size: 1.5rem;  /* Example: Size for "My Stories (X)" */
  font-weight: 600; /* semibold */
  color: inherit; /* Inherits black from parent */
}

.story-item {
  /* Styles for each <li> item in the list */
}

.story-item-text, /* For "No stories found" and list item text */
.story-item .story-name { /* Target the span holding the story name */
  font-size: 1.3rem;  /* INCREASED FONT SIZE for story names/text */
  line-height: 1.6;
  color: inherit; /* Inherits black from parent */
}

.btn-download-item {
  /* Tailwind: bg-blue-600 hover:bg-blue-700 text-white */
  /* You can add more specific styles here if Tailwind isn't enough */
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.error-message { color: red; margin-top: 1rem; /* Basic error styling */ }
.loading-indicator { margin-top: 1rem; color: #555; }


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
