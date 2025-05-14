<!-- CreateNarrative.vue -->
<template>
  <div class="max-w-4xl mx-auto px-4">
    <h1 class="text-3xl font-didot font-bold text-center my-6">Create Narrative</h1>

    <!-- User Info / Error Display -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600 font-didot">
      Loading user status...
    </div>
     <div v-else-if="!userId" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
       <span class="block sm:inline">
         <strong class="font-bold">User Not Identified:</strong> Please go back and ensure you are logged in via Ghost. Narrative features require login.
       </span>
     </div>
     <div v-else class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
       <span class="block sm:inline">
         <strong class="font-bold">User:</strong> {{ authUserName || userId }}. Ready to manage narratives.
       </span>
     </div>

     <!-- Loading spinner for narrative actions -->
     <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="spinner"></div>
     </div>

     <!-- Error/Success Messages -->
     <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
       <span class="block sm:inline">{{ error }}</span>
     </div>
     <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4">
       <span class="block sm:inline">{{ successMessage }}</span>
     </div>


    <!-- Narrative creation/display logic -->
    <div v-if="userId"> <!-- Only show main content if user is identified -->
      <div class="mb-6 p-4 border rounded shadow">
          <h2 class="text-xl font-didot font-bold mb-3">Your Saved Stories</h2>
          <div v-if="storiesLoading" class="text-center text-gray-500">Loading stories...</div>
          <div v-else-if="userStories.length === 0" class="text-center text-gray-500">No saved stories found.</div>
          <div v-else class="max-h-60 overflow-y-auto border p-2 rounded bg-gray-50">
              <ul>
                  <li v-for="story in userStories" :key="story.id" class="mb-2">
                      <label class="flex items-center font-didot">
                          <input
                              type="checkbox"
                              :value="story"
                              v-model="selectedStories"
                              class="mr-2"
                          />
                          {{ story.story_name }}
                           <span class="text-xs text-gray-500 ml-auto"> ({{ formatDate(story.created_at) }})</span>
                      </label>
                  </li>
              </ul>
          </div>
           <p v-if="userStories.length > 0" class="text-sm text-gray-600 mt-2">Select at least two stories to generate a narrative.</p>
      </div>

       <!-- Narrative Generation -->
       <div class="mb-6 p-4 border rounded shadow">
            <h2 class="text-xl font-didot font-bold mb-3">Generate New Narrative</h2>
            <div class="mb-3">
                <label for="narrativeTheme" class="block text-sm font-medium text-gray-700 mb-1">Optional Theme:</label>
                <input
                    type="text"
                    id="narrativeTheme"
                    v-model="narrativeTheme"
                    placeholder="e.g., Overcoming fear, The power of friendship"
                    class="w-full border rounded px-3 py-2 font-didot"
                />
            </div>
            <button
                @click="generateNarrative"
                :disabled="selectedStories.length < 2 || loading"
                class="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Generate Narrative from Selected
            </button>
       </div>

       <!-- Generated Narrative Display & Save -->
        <div v-if="generatedNarrativeContent" class="mb-6 p-4 border rounded shadow bg-yellow-50">
            <h2 class="text-xl font-didot font-bold mb-3">Generated Narrative</h2>
             <textarea
                 v-model="generatedNarrativeContent"
                 rows="10"
                 class="w-full border rounded p-2 font-didot bg-white mb-3"
             ></textarea>
             <div class="flex flex-wrap items-center gap-4">
                 <label for="narrativeName" class="font-didot">Narrative Name:</label>
                 <input
                     type="text"
                     id="narrativeName"
                     v-model="narrativeName"
                     placeholder="Enter a name for this narrative"
                     class="border rounded px-3 py-2 flex-grow font-didot"
                  />
                 <button
                     @click="saveNarrative"
                     :disabled="!narrativeName.trim() || loading"
                     class="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 font-didot disabled:opacity-50"
                  >
                     Save Narrative
                 </button>
                  <button
                     @click="downloadNarrativePDF"
                     :disabled="!narrativeName.trim() || loading"
                     class="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 font-didot disabled:opacity-50"
                  >
                     Download PDF
                 </button>
             </div>
        </div>

       <!-- Saved Narratives List -->
        <div class="mb-6 p-4 border rounded shadow">
             <h2 class="text-xl font-didot font-bold mb-3">Your Saved Narratives</h2>
             <div v-if="narrativesLoading" class="text-center text-gray-500">Loading narratives...</div>
             <div v-else-if="userNarratives.length === 0" class="text-center text-gray-500">No saved narratives found.</div>
             <ul v-else>
                 <li v-for="narrative in userNarratives" :key="narrative.id" class="mb-2 p-2 border-b">
                     <p class="font-bold font-didot">{{ narrative.narrative_name }}</p>
                     <p class="text-sm text-gray-600 font-didot">Created: {{ formatDate(narrative.created_at) }}</p>
                     <p class="text-sm text-gray-600 font-didot">Sources: {{ narrative.source_stories?.join(', ') || 'N/A' }}</p>
                     <!-- Add buttons to view/edit/delete/download PDF narrative if needed -->
                 </li>
             </ul>
        </div>

    </div> <!-- End v-if="userId" -->

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { saveAs } from 'file-saver';

const authStore = useAuthStore();
const {
    userId, // Still useful for conditional UI or if some non-API logic needs it
    userName: authUserName,
    isLoading: authIsLoading,
    isAuthenticated,
    error: authError
} = storeToRefs(authStore);

const userStories = ref([]);
const selectedStories = ref([]);
const userNarratives = ref([]);
const narrativeTheme = ref("");
const narrativeName = ref("");
const generatedNarrativeContent = ref("");
const loading = ref(false);
const storiesLoading = ref(false);
const narrativesLoading = ref(false);
const error = ref(null);
const successMessage = ref(null);

const clearMessages = () => { error.value = null; successMessage.value = null; };

const formatDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    try {
        const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.warn("Error formatting date:", dateInput, e);
        return String(dateInput);
    }
};

const fetchUserStories = async () => {
    if (!isAuthenticated.value) {
        console.warn("fetchUserStories: User not authenticated. Skipping fetch.");
        userStories.value = [];
        return;
    }
    storiesLoading.value = true;
    clearMessages();
    try {
        console.log(`Fetching stories for authenticated user...`);
        // MODIFICATION: Call API without userId param, backend uses token
        const responseData = await api.getUserStories();
        userStories.value = Array.isArray(responseData) ? responseData : [];
    } catch (err) {
        console.error("API Error fetching stories:", err);
        error.value = `Failed to load stories. ${err.message || 'Please try again.'}`;
        userStories.value = [];
    } finally {
        storiesLoading.value = false;
    }
};

const fetchUserNarratives = async () => {
     if (!isAuthenticated.value) {
        console.warn("fetchUserNarratives: User not authenticated. Skipping fetch.");
        userNarratives.value = [];
        return;
    }
    narrativesLoading.value = true;
    clearMessages();
    try {
        console.log(`Fetching narratives for authenticated user...`);
        // MODIFICATION: Call API without userId param, backend uses token
        const responseData = await api.getUserNarratives();
        userNarratives.value = Array.isArray(responseData) ? responseData : [];
    } catch (err) {
        console.error("API Error fetching narratives:", err);
        error.value = `Failed to load narratives. ${err.message || 'Please try again.'}`;
        userNarratives.value = [];
    } finally {
        narrativesLoading.value = false;
    }
};

const generateNarrative = async () => {
    if (!isAuthenticated.value) { error.value = "Please log in."; return; }
    if (selectedStories.value.length < 2) { error.value = "Please select at least two stories."; return; }

    loading.value = true;
    clearMessages();
    generatedNarrativeContent.value = null;

    try {
        const storiesForPayload = selectedStories.value.map(s => ({
             story_id: s.id || s.story_id, // Adjust based on your story object structure
             content: s.story_content || s.story || '' // Adjust based on story object structure
        }));

        const payload = {
            selected_stories: storiesForPayload,
            narrative_theme: narrativeTheme.value || undefined
        };

        console.log(`Generating narrative with theme: "${payload.narrative_theme}"`);
        const responseData = await api.generateNarrative(payload);

        generatedNarrativeContent.value = responseData.narrative;
        const sourceIds = responseData.source_stories || selectedStories.value.map(s => s.id || s.story_id);
        narrativeName.value = `Narrative from ${sourceIds.slice(0, 2).join(' and ')}`;
        successMessage.value = "Narrative generated! Review and save below.";
        setTimeout(() => { successMessage.value = null; }, 5000);

    } catch (err) {
        console.error("API Error generating narrative:", err);
        error.value = `Failed to generate narrative. ${err.message || 'Please try again.'}`;
    } finally {
        loading.value = false;
    }
};

const saveNarrative = async () => {
    if (!isAuthenticated.value) { error.value = "Please log in."; return; }
    if (!narrativeName.value.trim()) { error.value = "Please enter a name."; return; }
    if (!generatedNarrativeContent.value?.trim()) { error.value = "No content to save."; return; }

    loading.value = true;
    clearMessages();

    try {
        const sourceStoryIds = selectedStories.value.map(s => s.id || s.story_id);
        const narrativeData = {
            narrative_name: narrativeName.value.trim(),
            narrative_content: generatedNarrativeContent.value,
            source_stories: sourceStoryIds
        };

        console.log(`Saving narrative "${narrativeData.narrative_name}"...`);
        await api.saveNarrative(narrativeData);

        successMessage.value = `Narrative "${narrativeData.narrative_name}" saved!`;
        setTimeout(() => { successMessage.value = null; }, 5000);

        await fetchUserNarratives();

        generatedNarrativeContent.value = null;
        narrativeName.value = "";
        selectedStories.value = [];
        narrativeTheme.value = "";

    } catch (err) {
        console.error("API Error saving narrative:", err);
        error.value = `Failed to save narrative. ${err.message || 'Please try again.'}`;
    } finally {
        loading.value = false;
    }
};

const downloadNarrativePDF = async () => {
     if (!isAuthenticated.value) { error.value = "Please log in."; return; }
     if (!narrativeName.value.trim()) { error.value = "Please enter a Narrative Name."; return; }
     if (!generatedNarrativeContent.value?.trim()) { error.value = "No content to download."; return; }

     loading.value = true;
     clearMessages();

     try {
          const narrativeTitle = narrativeName.value.trim();
          const sourceStoryNames = selectedStories.value.map(s => s.story_name || `Story ${s.id || s.story_id}`);

          const payload = {
              narrative_name: narrativeTitle,
              narrative_content: generatedNarrativeContent.value,
              source_stories: sourceStoryNames
          };

          console.log(`Generating PDF for narrative "${narrativeTitle}"`);
          const blob = await api.generateNarrativePDF(payload);

          saveAs(blob, `${narrativeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'narrative'}.pdf`);
          successMessage.value = "Narrative PDF download started.";
          setTimeout(() => { successMessage.value = null; }, 4000);

     } catch (err) {
          console.error('API Error generating narrative PDF:', err);
          error.value = `Failed to generate narrative PDF. ${err.message || ''}`;
     } finally {
          loading.value = false;
     }
};

onMounted(() => {
  console.log("CreateNarrative component mounted.");
  if (isAuthenticated.value) {
    console.log("User authenticated on mount, fetching initial data...");
    fetchUserStories();
    fetchUserNarratives();
  } else {
    console.warn("CreateNarrative mounted, user not authenticated yet. Waiting for auth state change.");
  }
});

watch(isAuthenticated, (isAuth, wasAuth) => {
    if (isAuth === true && wasAuth === false) {
        console.log("CreateNarrative: User became authenticated. Fetching data.");
        fetchUserStories();
        fetchUserNarratives();
    }
     if (isAuth === false && wasAuth === true) {
         console.log("CreateNarrative: User logged out. Clearing data.");
          userStories.value = [];
          userNarratives.value = [];
          selectedStories.value = [];
          generatedNarrativeContent.value = null;
          narrativeName.value = "";
          narrativeTheme.value = "";
          clearMessages();
     }
});
</script>

<style scoped>
/* Using Tailwind utilities, scoped styles might not be heavily needed */
/* But keep custom fonts or complex styles here */
@font-face {
    font-family: 'Didot';
    src: url('@/assets/fonts/Didot.woff2') format('woff2'),
        url('@/assets/fonts/Didot.woff') format('woff');
    font-weight: normal;
    font-style: normal;
}
.font-didot {
   font-family: 'Didot', serif;
}
.error-message {
  color: red;
}
.story-name-header {
  width: 25%; /* 1/4 width for Story Name header */
}
.story-name {
  word-break: break-all; /* Wrap long story names */
  max-width: 25%;        /* Prevent overflowing the container */
}
.story-content-header {
  width: 75%; /* 3/4 width for Story header */
}
.story-content {
  white-space: pre-line; /* Preserve whitespace and line breaks */
  word-break: break-word; /* Wrap long words */
  max-width: 75%;         /* Takes 3/4 width */
}
.loading-spinner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  border: 4px solid #f3f3f3; /* Light grey */
  border-top: 4px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Add some explicit height/styles for textarea inside scrollbox if needed */
.bg-chatbox-light textarea {
    min-height: 200px; /* Ensure textarea takes up space */
}
</style>
