<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import api from '@/services/api';

const authStore = useAuthStore();
const { userId, authUserName, authError, authIsLoading, isAuthenticated } = storeToRefs(authStore);

const storyTellerInput = ref('');
const storyContent = ref('');
const loading = ref(false);
const generationError = ref(null);
const sessionId = ref(null);
const isCompleted = ref(false);
const storyName = ref('');
const uploadLoading = ref(false);
const uploadError = ref(null);
const uploadSuccessMessage = ref(null);
const storyNameTouched = ref(false);
const isCompletingStory = ref(false);

// --- System Prompt for Gemini ---
const geminiSystemInstructions = `You are an AI assistant with a passion for creative writing and storytelling. The target audience is children working with their parents or grandparents. Your task is to collaborate with users to create engaging stories, offering imaginative plot twists and dynamic character development. Encourage the user to contribute their ideas and build upon them to create a captivating narrative.

The STORY should be composed in segments each approximately 150 words. Each segment should continue the narrative from the previous.

When the user hits "Complete Story", provide the complete story with any modifications required to make a smooth narrative. The FINAL STORY should be approximately 1,000 to 1,200 words.
`;

const isStoryNameValid = computed(() => storyName.value.trim().length > 0);
const showNameError = computed(() => storyNameTouched.value && !isStoryNameValid.value);

// This function manually checks token if refreshTokenIfNeeded doesn't exist
async function ensureAuthenticated() {
  if (!isAuthenticated.value) {
    throw new Error("Not authenticated. Please log in again.");
  }

  // If the auth store has a refreshTokenIfNeeded function, use it
  if (typeof authStore.refreshTokenIfNeeded === 'function') {
    await authStore.refreshTokenIfNeeded();
  } else {
    // Otherwise, we'll just verify the token is present
    const token = localStorage.getItem('app_auth_token');
    if (!token) {
      throw new Error("Authentication token is missing. Please log in again.");
    }
    // Log that we're proceeding with the existing token
    console.log("Using existing authentication token");
  }

  return true;
}

async function generateStory() {
  try {
    // Ensure we're authenticated using our helper function
    await ensureAuthenticated();

    if (!storyTellerInput.value.trim() || !isAuthenticated.value) return;
    if (!userId.value) {
      throw new Error("User ID is missing. Please log in again.");
    }

    loading.value = true;
    isCompletingStory.value = false;
    generationError.value = null;
    uploadSuccessMessage.value = null;
    uploadError.value = null;

    let responseData;
    let promptForApi = storyTellerInput.value;

    if (!sessionId.value) { // START NEW STORY
      isCompleted.value = false; // Ensure new story starts as not completed
      // Prepend system instructions to the user's very first prompt
      promptForApi = `${geminiSystemInstructions}\n\nStoryteller's idea: ${storyTellerInput.value}`;

      // ADD USER ID TO PAYLOAD
      const payload = {
        initial_prompt: promptForApi,
        user_id: userId.value // Add user ID directly to request payload
      };
      console.log("Calling api.startStory with payload:", payload);
      responseData = await api.startStory(payload);

      if (responseData && responseData.story && responseData.session_id) {
        storyContent.value = responseData.story;
        sessionId.value = responseData.session_id;
      } else {
        console.error("Invalid response from startStory:", responseData);
        throw new Error("Failed to start story. Invalid response from server.");
      }
    } else { // CONTINUE EXISTING STORY
      isCompleted.value = false; // Continuing means it's not yet complete

      // ADD USER ID TO PAYLOAD
      const payload = {
        session_id: sessionId.value,
        feedback: promptForApi,
        user_id: userId.value // Add user ID directly to request payload
      };
      console.log("Calling api.continueStory with payload:", payload);
      responseData = await api.continueStory(payload);

      if (responseData && responseData.story) {
        if (responseData.full_story_draft) {
          storyContent.value = responseData.full_story_draft;
        } else {
          storyContent.value = (storyContent.value ? storyContent.value + "\n\n" : "") + responseData.story;
        }
      } else {
        console.error("Invalid response from continueStory:", responseData);
        throw new Error("Failed to continue story. Invalid response from server.");
      }
    }
    storyTellerInput.value = '';
  } catch(e) {
    console.error("Error in generateStory:", e);
    generationError.value = e.message || "Failed to generate story content.";
  } finally {
    loading.value = false;
  }
}

async function completeStory() {
  if (!sessionId.value || !isAuthenticated.value || loading.value) return;
  if (!userId.value) {
    generationError.value = "User ID is missing. Please log in again.";
    return;
  }

  loading.value = true;
  isCompletingStory.value = true;
  generationError.value = null;

  try {
    console.log("Calling api.completeStory for session:", sessionId.value);

    // ADD USER ID TO PAYLOAD
    const payload = {
      session_id: sessionId.value,
      user_id: userId.value // Add user ID directly to request
    };
    const responseData = await api.completeStory(payload);

    if (responseData) {
      if (responseData.story) {
        storyContent.value = responseData.story; // This should be the full, finalized story
      } else {
        // This case should be rare if the backend's completeStory always returns the full text
        storyContent.value += "\n\n(The story has been marked as complete by the AI, but no final text was explicitly returned. Displaying current draft as final.)";
      }
      isCompleted.value = responseData.complete !== undefined ? responseData.complete : true;
    } else {
      console.error("Invalid or empty response from completeStory API call.");
      throw new Error("Failed to finalize the story. Invalid response from server.");
    }
  } catch(e) {
    console.error("Error in completeStory:", e);
    generationError.value = e.message || "Failed to finalize story.";
    isCompleted.value = false;
  } finally {
    loading.value = false;
    isCompletingStory.value = false;
  }
}

async function uploadToDatabase() {
  storyNameTouched.value = true;
  if (!isStoryNameValid.value || !isAuthenticated.value || !storyContent.value) {
    if (!storyContent.value) uploadError.value = "There is no story content to save.";
    return;
  }
  if (!userId.value) {
    uploadError.value = "User ID is missing. Please log in again.";
    return;
  }

  uploadLoading.value = true;
  uploadError.value = null;
  uploadSuccessMessage.value = null;

  // ADD USER ID TO PAYLOAD
  const storyData = {
    story_name: storyName.value.trim(),
    story_content: storyContent.value, // Save the final, potentially completed story
    sessionId: sessionId.value, // Optional: link to original session
    user_id: userId.value // Add user ID directly to request payload
  };

  console.log("Calling api.saveStory with data:", storyData);
  try {
    const response = await api.saveStory(storyData);
    console.log("Upload response:", response);
    uploadSuccessMessage.value = response.message || `Story "${storyData.story_name}" saved successfully!`;
  } catch (error) {
    console.error("Error uploading story:", error);
    uploadError.value = error.message || 'An unknown error occurred during upload.';
  } finally {
    uploadLoading.value = false;
  }
}

// Added function to download story as PDF
async function downloadAsPDF() {
  if (!storyContent.value || !storyName.value.trim()) {
    uploadError.value = "Please provide both story content and a title to download PDF";
    return;
  }
  if (!userId.value) {
    uploadError.value = "User ID is missing. Please log in again.";
    return;
  }

  try {
    uploadLoading.value = true;

    // ADD USER ID TO PAYLOAD
    const pdfData = {
      story_name: storyName.value.trim(),
      story_content: storyContent.value,
      user_id: userId.value // Add user ID directly to request payload
    };

    const pdfBlob = await api.generateStoryPDF(pdfData);

    // Create a download link
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${storyName.value.trim().replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    uploadSuccessMessage.value = "PDF downloaded successfully!";
  } catch (error) {
    console.error("Error downloading PDF:", error);
    uploadError.value = error.message || 'Failed to download PDF';
  } finally {
    uploadLoading.value = false;
  }
}

watch(isAuthenticated, (isAuth, wasAuth) => {
  if (!isAuth && wasAuth) {
    storyTellerInput.value = '';
    storyContent.value = '';
    loading.value = false;
    isCompletingStory.value = false;
    generationError.value = null;
    sessionId.value = null;
    isCompleted.value = false;
    storyName.value = '';
    uploadLoading.value = false;
    uploadError.value = null;
    uploadSuccessMessage.value = null;
    storyNameTouched.value = false;
    console.log("User logged out, CreateStory state reset.");
  }
});

onMounted(async () => {
  // Check if we're authenticated and verify token without using refreshTokenIfNeeded
  if (isAuthenticated.value) {
    try {
      // Try to use ensureAuthenticated instead of directly calling refreshTokenIfNeeded
      await ensureAuthenticated();

      // Add debug info about our user ID
      console.log(`Authenticated as user with ID: ${userId.value}`);
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }

  console.log('CreateStory - onMounted: Checking for Ghost redirect query parameters...');
  const urlParams = new URLSearchParams(window.location.search);
  const ghostMemberUUID = urlParams.get('ghost_member_uuid');
  if (ghostMemberUUID) {
    console.log('CreateStory - onMounted: Ghost member UUID found. Attempting to process login.');
    const ghostMemberEmail = urlParams.get('ghost_member_email');
    const ghostMemberName = urlParams.get('ghost_member_name');
    const ghostMemberStatus = urlParams.get('ghost_member_status');
    const ghostMemberTier = urlParams.get('ghost_member_tier');
    try {
      authStore.processGhostLogin({
        userId: ghostMemberUUID,
        userName: ghostMemberName,
        userEmail: ghostMemberEmail,
        userStatus: ghostMemberStatus,
        userTier: ghostMemberTier
      });
      console.log('CreateStory - onMounted: Auth store update dispatched for Ghost login.');
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('CreateStory - onMounted: Cleared query parameters from URL.');
    } catch (error) {
      console.error("CreateStory - onMounted: Error calling authStore.processGhostLogin:", error);
      authStore.setError('Failed to process login information from redirect.');
    }
  } else {
    console.log('CreateStory - onMounted: No Ghost member UUID in query params.');
  }
});
</script>

<template>
  <div class="create-story-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- =================================================== -->
    <!-- 1. Authentication Status Display                  -->
    <!-- =================================================== -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Loading user information...
    </div>
    <div v-else-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span class="block sm:inline">
        <strong class="font-bold">Authentication Error:</strong> {{ authError }}. Please try logging in again. Features requiring login may be disabled.
      </span>
    </div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         Please log in via Ghost to create and save stories.
       </span>
    </div>
     <!-- MODIFIED INSTRUCTION BOX -->
     <div v-else-if="userId" class="my-4 p-4 rounded-md shadow-md"
          :style="{ backgroundColor: '#FFE086', color: 'black' }"
          role="status">
      <p class="font-bold text-lg mb-2">
        {{ authUserName || 'StoryTeller' }}, let's begin!
      </p>
      <p v-if="!storyContent && !sessionId" class="text-lg">
        Create an ADVENTURE STORY with CHARACTERS, SETTING, ACTION, MOTIVATION, CHALLENGE and STORY LINE provided by you, the StoryTeller.
        I will introduce at least one SURPRISE CHARACTER to challenge the HERO and a PLOT TWIST.
        You can respond to my additional prompts to revise or continue your story.
        When ready, hit the COMPLETE STORY button which allows saving your story and an option to download a PDF.
      </p>
      <p v-else class="font-bold text-lg">
        Please continue the story, be imaginative, and know that you can modify the existing story or ask for changes!
      </p>
    </div>

    <!-- =================================================== -->
    <!-- 2. Main Story Creation Area (only if authenticated) -->
    <!-- =================================================== -->
    <div v-if="isAuthenticated" class="story-creation-area mt-6"> <!-- Added mt-6 for spacing -->
      <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">Create Your Story</h1>

      <!-- Display Area for Generated Story Content -->
      <div v-if="storyContent" class="story-display bg-white p-4 md:p-6 rounded shadow-md mb-6 border border-gray-200 min-h-[200px]">
        <h3 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Current Story Draft:</h3>
        <pre class="whitespace-pre-wrap font-sans text-gray-800 text-base leading-relaxed">{{ storyContent }}</pre>
         <p v-if="isCompleted" class="mt-4 text-green-600 font-semibold">Story marked as complete. You can now name and save it below.</p>
      </div>

      <!-- Input Area for User Prompt/Feedback -->
      <div class="mb-4">
        <label for="storyInput" class="block text-lg font-medium text-gray-800 mb-2">
          {{ sessionId ? 'Your turn! What happens next, or how should we change the story?' : 'Enter your initial story idea:' }}
        </label>
        <textarea
          id="storyInput"
          v-model="storyTellerInput"
          rows="5"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md p-3 font-sans"
          :placeholder="sessionId ? 'Why not create a surprise challenge?\nOr: How about a character acting up?' : 'Create a decision to make with bad alternatives!!!'"
          aria-label="Story input or feedback"
        ></textarea>
      </div>

      <!-- Action Buttons: Start/Continue/Complete -->
      <div class="flex flex-wrap justify-center items-center gap-4 mb-6">
        <button
          @click="generateStory"
          :disabled="!storyTellerInput.trim() || loading || !isAuthenticated"
          class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :title="!isAuthenticated ? 'Please log in first' : (!storyTellerInput.trim() ? 'Enter some text first' : '')"
        >
          <svg v-if="loading && !isCompletingStory" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ (loading && !isCompletingStory) ? 'Generating...' : (sessionId ? 'Continue Story' : 'Start Story') }}
        </button>

        <button
            v-if="sessionId && !isCompleted"
            @click="completeStory"
            :disabled="loading || !isAuthenticated"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ask the AI to finalize the story"
        >
            <svg v-if="loading && isCompletingStory" class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ (loading && isCompletingStory) ? 'Finalizing...' : 'Complete Story' }} <!-- Changed Button Text -->
        </button>
      </div>

       <div v-if="generationError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
         <span class="block sm:inline">
           <strong class="font-bold">Generation Error:</strong> {{ generationError }}
         </span>
       </div>

      <!-- Save Section (Conditional) -->
      <!-- Show if completed OR if it's a single-shot story (storyContent exists but no sessionId yet) -->
      <div v-if="isCompleted || (storyContent && !sessionId && !loading)" class="mt-8 p-4 md:p-6 border-t border-gray-300 bg-gray-50 rounded-md">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">Save Your Story</h3>
        <div class="mb-4">
            <label for="storyName" class="block text-sm font-medium text-gray-800 mb-1">Story Name:</label>
            <input
                type="text"
                id="storyName"
                v-model="storyName"
                required
                @blur="storyNameTouched = true"
                class="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 font-sans"
                placeholder="Enter a name for your masterpiece"
                aria-required="true"
            />
             <p v-if="showNameError" class="text-red-600 text-sm mt-1">Please enter a name for your story.</p>
        </div>

        <div class="flex flex-wrap gap-4">
          <button
              @click="uploadToDatabase"
              :disabled="!isStoryNameValid || uploadLoading || !isAuthenticated || !storyContent"
              class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save the final story content to your account"
          >
              <svg v-if="uploadLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ uploadLoading ? 'Saving...' : 'Save Story to Database' }}
          </button>

          <!-- Added PDF Download Button -->
          <button
              @click="downloadAsPDF"
              :disabled="!isStoryNameValid || uploadLoading || !isAuthenticated || !storyContent"
              class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download your story as a PDF file"
          >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Download as PDF
          </button>
        </div>

        <div v-if="uploadError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span class="block sm:inline"><strong class="font-bold">Upload Error:</strong> {{ uploadError }}</span>
        </div>
        <div v-if="uploadSuccessMessage" class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
          <span class="block sm:inline"><strong class="font-bold">Success!</strong> {{ uploadSuccessMessage }}</span>
        </div>

        <!-- Added Navigation Link to My Stories -->
        <div class="mt-4 text-center">
          <router-link
            to="/my-stories"
            class="inline-block text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            View My Saved Stories
          </router-link>
        </div>
      </div>
    </div> <!-- End v-if="isAuthenticated" -->
  </div>
</template>

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
   font-family: 'Didot', 'Bodoni MT', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}
.story-display pre {
  font-family: 'Georgia', 'Times New Roman', Times, serif; /* Example serif font */
  font-size: 1.1rem; /* Slightly larger for readability */
  line-height: 1.7;
  color: #333; /* Darker gray for text */
}
/* Styles from the provided example are kept below */
.container {
  padding-bottom: 3rem;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.page-container {
  max-width: 1000px;
   margin: 0 auto;
    text-align: left;
}

.storyteller-input {
  margin-bottom: 20px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 10px;
  resize: vertical;
}

.buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-button {
  background-color: #4a6fa5;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background-color: #3a5a8c;
}

.secondary-button {
  background-color: #6c757d;
  color: white;
}

/* Add any custom styles to match your existing design */
</style>
