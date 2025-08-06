<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import api from '@/services/api';

const authStore = useAuthStore();
const { userId, authUserName, authError, authIsLoading, isAuthenticated } = storeToRefs(authStore);

const storyTellerInput = ref('');
const storyContent = ref('');
const loading = ref(false);
const sessionId = ref<string | null>(null);
const isCompleted = ref(false);
const storyName = ref('');
const uploadLoading = ref(false);
const uploadError = ref(null);
const uploadSuccessMessage = ref(null);
const storyNameTouched = ref(false);
const isCompletingStory = ref(false);
const currentIteration = ref(0);
const aiSuggestionForNextTurn = ref<string | null>(null);
const placeholderPrompts = ref<string[]>([]);
const currentPlaceholder = ref('');
const generationError = ref<string | null>(null);
const initialGuidanceFromAPI = ref<string>('');

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

async function fetchUiTexts() { // Renamed from fetchAndSetPlaceholders
    try {
        const uiTexts = await api.getUiTexts(); // Call new method
        if (uiTexts.placeholderPrompts && uiTexts.placeholderPrompts.length > 0) {
            placeholderPrompts.value = uiTexts.placeholderPrompts;
        } else {
            placeholderPrompts.value = ["What happens next in the story?"]; // Default
        }
        initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance || "Let's write a story!"; // Default
        getRandomPlaceholder();
    } catch (e) {
        console.error("Failed to fetch placeholder prompts, using defaults:", e);
        placeholderPrompts.value = ["What creative idea will you add?"];
    }
}

function getRandomPlaceholder() {
  if (placeholderPrompts.value.length === 0) {
    currentPlaceholder.value = "What happens next?"; // Absolute fallback
    return;
  }
  const randomIndex = Math.floor(Math.random() * placeholderPrompts.value.length);
  currentPlaceholder.value = placeholderPrompts.value[randomIndex];
}

async function generateStory() {
  try {
    await ensureAuthenticated();
    if (!storyTellerInput.value.trim() || !isAuthenticated.value) return;
    if (!userId.value) { throw new Error("User ID is missing."); }

    loading.value = true;
    generationError.value = null;
    // isCompletingStory.value = false; // This ref seems specific to completeStory button state

    let responseData;
    const userProvidedInput = storyTellerInput.value.trim(); // The actual text from the user

    if (!sessionId.value) { // START NEW STORY
      isCompleted.value = false;
      aiSuggestionForNextTurn.value = null;

      const payload = {
        initial_prompt: userProvidedInput, // Send only the user's idea
        user_id: userId.value
      };
      console.log("[CreateStory.vue] Calling api.startStory with payload:", payload);
      responseData = await api.startStory(payload);

      if (responseData && responseData.story && responseData.session_id) {
        storyContent.value = responseData.story;
        sessionId.value = responseData.session_id;
        currentIteration.value = responseData.iteration || 1;
        aiSuggestionForNextTurn.value = responseData.next_prompt_for_user || null;
        isCompleted.value = responseData.complete || false;
      } else {
        throw new Error("Failed to start story. Invalid response from server.");
      }
    } else { // CONTINUE EXISTING STORY
      isCompleted.value = false;

      const payload = { session_id: sessionId.value, feedback: userProvidedInput, user_id: userId.value };
      responseData = await api.continueStory(payload);

      if (responseData && responseData.story) {
        storyContent.value = responseData.full_story;
        currentIteration.value = responseData.iteration || (currentIteration.value + 1); // Backend sends incremented
        aiSuggestionForNextTurn.value = responseData.next_prompt_for_user || null;
        isCompleted.value = responseData.complete || false;
      } else { /* ... error handling ... */ }
    }
    storyTellerInput.value = '';
  } catch(e) { /* ... */ }
  finally { loading.value = false; }
}

async function completeStory() {
  if (!sessionId.value || !isAuthenticated.value || loading.value) return;
  if (!userId.value) { generationError.value = "User ID missing."; return; }

  loading.value = true;
  generationError.value = null;

  try {
    const payload = { session_id: sessionId.value, user_id: userId.value };
    console.log("[CreateStory.vue] Calling api.completeStory with payload:", payload);
    const responseData = await api.completeStory(payload);

    if (responseData && responseData.story) {
      storyContent.value = responseData.story; // This is the full, finalized story
      currentIteration.value = responseData.iteration || currentIteration.value; // Keep last iteration
      aiSuggestionForNextTurn.value = null; // No more suggestions after completion
      isCompleted.value = responseData.complete !== undefined ? responseData.complete : true;
    } else {
      throw new Error("Failed to finalize story. Invalid response from server.");
    }
  } catch(e) {
    console.error("Error in completeStory:", e);
    generationError.value = e.message || "Failed to finalize story.";
    isCompleted.value = false; // Revert on error
  } finally {
    loading.value = false;
    // isCompletingStory.value = false;
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
  await fetchUiTexts();
  getRandomPlaceholder();
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
  getRandomPlaceholder();
  watch(storyContent, () => { // Example: change placeholder when storyContent updates
    if (!storyTellerInput.value) { // Only if user hasn't typed something
        getRandomPlaceholder();
    }
  })

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
        <strong class="font-bold">Authentication Error:</strong> {{ authError }}. Please try logging in again.
      </span>
    </div>
    <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
       <span class="block sm:inline">
         Please log in via Ghost to create and save stories.
       </span>
    </div>

    <!-- INSTRUCTION BOX / STATUS BOX (Orange Box) -->
    <div v-if="isAuthenticated && userId"
        class="instruction-box my-4 p-4 rounded-md shadow-md"
        :style="{ backgroundColor: '#FFE086', color: 'black' }"
        role="status">

        <p class="instruction-box-greeting mb-2">
            Hello {{ authUserName || 'Storyteller' }}!
            <!-- Display logic for turn information -->
            <span v-if="!sessionId && currentIteration === 0">
                Let's Begin! (Ready for Turn 1)
            </span>
            <span v-else-if="sessionId && !isCompleted && currentIteration > 0">
                Your turn to provide input for Story Turn {{ currentIteration + 1 }}. (AI completed Turn {{ currentIteration }})
            </span>
            <span v-else-if="isCompleted && currentIteration > 0">
                Story Complete ({{ currentIteration }} turns total).
            </span>
        </p>

        <div v-if="!sessionId && currentIteration === 0" class="instruction-box-text"> <!-- Initial state -->
            <p v-if="initialGuidanceFromAPI" v-html="initialGuidanceFromAPI.replace(/\n/g, '<br>')"></p>
            <p v-else>Enter your initial story idea to start our adventure!</p>
        </div>
        <div v-else-if="!isCompleted" class="instruction-box-text"> <!-- Story in progress -->
            <p v-if="aiSuggestionForNextTurn" class="italic">
                <strong>Suggestion for your next contribution:</strong> "{{ aiSuggestionForNextTurn }}"
            </p>
            <p v-else>
                What happens next? Add to the story or suggest a new direction!
            </p>
            <p class="instruction-box-note mt-1">Remember, you can always ask for changes or guide the story differently.</p>
        </div>
        <div v-else class="instruction-box-text"> <!-- Story is completed -->
            <p class="font-semibold">Your story, "{{ storyName || 'Untitled Story' }}", is complete!</p>
            <p>You can now save it to your collection or download it as a PDF.</p>
        </div>
    </div>
    <!-- End Instruction Box -->

    <!-- Loading spinner for AI actions -->
     <div v-if="loading || uploadLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="spinner"></div>
       <p class="text-white ml-3 text-lg">
         {{ loading && !isCompletingStory ? 'Generating Story...' : (loading && isCompletingStory ? 'Finalizing Story...' : (uploadLoading ? 'Saving...' : 'Processing...')) }}
       </p>
     </div>

     <!-- Error/Success Messages for story generation/saving -->
     <div v-if="generationError" class="my-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
       <p class="font-bold">Story Generation Error</p>
       <p>{{ generationError }}</p>
     </div>
     <div v-if="uploadError" class="my-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
       <p class="font-bold">Save Error</p>
       <p>{{ uploadError }}</p>
     </div>
     <div v-if="uploadSuccessMessage" class="my-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
       <p class="font-bold">Success</p>
       <p>{{ uploadSuccessMessage }}</p>
     </div>


    <!-- =================================================== -->
    <!-- Main Story Creation Area (only if authenticated) -->
    <!-- =================================================== -->
    <div v-if="isAuthenticated" class="story-creation-area mt-6">
      <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
          {{ sessionId ? 'Continue Your Story' : 'Start a New Story' }}
      </h1>

      <!-- Display Area for Generated Story Content -->
      <div v-if="storyContent"
           class="story-display-container bg-white p-4 md:p-6 rounded shadow-md mb-6 border border-gray-200 min-h-[200px]">
        <h3 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Current Story Progress:</h3>
        <div class="story-content-text">{{ storyContent }}</div>
        <p v-if="isCompleted && storyContent" class="mt-4 text-green-600 font-semibold">
            This story is now complete! You can save it or download it as a PDF below.
        </p>
      </div>

      <!-- Input Area for User Prompt/Feedback (Show if story is not completed) -->
      <div v-if="!isCompleted" class="mb-4">
        <label for="story-teller-input" class="user-input-label block mb-2">
          {{ sessionId ? (aiSuggestionForNextTurn ? 'Respond to AI or add your own idea:' : 'Your turn! What happens next, or how should we change the story?') : 'Enter your initial story idea to begin:' }}
        </label>
        <textarea
          id="story-teller-input"
          v-model="storyTellerInput"
          :placeholder="aiSuggestionForNextTurn || currentPlaceholder || 'Type your story idea or continuation here...'"
          rows="5"
          class="user-input-textarea w-full border rounded px-3 py-2"
        ></textarea>
      </div>

      <!-- Action Buttons: Start/Continue/Complete -->
      <div v-if="!isCompleted" class="flex flex-wrap justify-center items-center gap-4 mb-6">

        <!-- This button serves two purposes: Start and Continue -->
        <button
          @click="generateStory"
          :disabled="!storyTellerInput.trim() || loading || !isAuthenticated"
          class="action-button primary-button"
          :title="!isAuthenticated ? 'Please log in first' : (!storyTellerInput.trim() ? 'Enter some text first' : (sessionId ? 'Continue with your input' : 'Start a new story with your idea'))"

          <!-- ADD THIS IDENTIFIER -->
          <!-- The ID changes based on the button's current function -->
          :data-testid="sessionId ? 'continue-story-button' : 'start-story-button'"
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
            class="action-button secondary-button"
            title="Ask the AI to write a final conclusion for the story"

            <!-- ADD THIS IDENTIFIER -->
            data-testid="complete-story-button"
        >
            <svg v-if="loading && isCompletingStory" class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ (loading && isCompletingStory) ? 'Finalizing...' : 'Complete Story' }}
        </button>
      </div>
      <!-- End Action Buttons -->

      <!-- Save Section (Conditional: Show if story is marked complete, or if content exists before session starts for a quick save) -->
      <div v-if="isCompleted || (storyContent && !sessionId && !loading && !isGenerating)"
           class="save-story-section mt-8 p-4 md:p-6 border-t border-gray-300 bg-gray-50 rounded-md">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">Save Your Masterpiece</h3>
        <div class="mb-4">
            <label for="storyNameInput" class="block text-sm font-medium text-gray-800 mb-1">Story Name:</label>
            <input
                type="text"
                id="storyNameInput"
                v-model="storyName"
                required
                @blur="storyNameTouched = true"
                class="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 font-sans"
                placeholder="Enter a name for your story"
                aria-required="true"
            />
             <p v-if="showNameError" class="text-red-600 text-sm mt-1">Please enter a name for your story.</p>
        </div>

        <div class="flex flex-wrap gap-4">
          <button
              @click="uploadToDatabase"
              :disabled="!isStoryNameValid || uploadLoading || !isAuthenticated || !storyContent"
              class="action-button bg-green-600 hover:bg-green-700 text-white"
              title="Save this story to your account"
          >
              <svg v-if="uploadLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <!-- ... spinner svg ... -->
              </svg>
              {{ uploadLoading ? 'Saving...' : 'Save Story to Database' }}
          </button>

          <button
              @click="downloadAsPDF"
              :disabled="!isStoryNameValid || !storyContent"
              class="action-button bg-gray-200 hover:bg-gray-300 text-gray-700"
              title="Download your story as a PDF file"
          >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Download as PDF
          </button>
        </div>

        <!-- Upload/Save messages moved inside this section -->
        <div v-if="uploadError" class="my-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p class="font-bold">Save Error</p><p>{{ uploadError }}</p>
        </div>
        <div v-if="uploadSuccessMessage" class="my-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
          <p class="font-bold">Success!</p><p>{{ uploadSuccessMessage }}</p>
        </div>

        <div class="mt-4 text-center">
          <router-link to="/my-stories" class="text-indigo-600 hover:text-indigo-800 hover:underline">
            View My Saved Stories
          </router-link>
        </div>
      </div> <!-- End Save Section -->

    </div> <!-- End v-if="isAuthenticated" for main content area -->
  </div> <!-- End Root create-story-page div -->
</template>

<style scoped>
/* Using Tailwind utilities, scoped styles might not be heavily needed */
/* But keep custom fonts or complex styles here */
@font-face {
    font-family: 'Didot';
    src: url('@/assets/fonts/TheanoDidot-Regular.ttf') format('truetype'); /* Semicolon */
    font-weight: normal;
    font-style: normal;
}
/* Optional: Apply Didot as a base font for the page if desired */
.create-story-page {
   font-family: 'Didot', 'Bodoni MT', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}

/* --- Instruction Box (Orange Box) Text Styling --- */
.instruction-box {
  /* Base styles for text directly inside .instruction-box or its <p> tags */
  /* Inline style :style="{ backgroundColor: '#FFE086', color: 'black' }" sets background and base text color */
  font-family: 'Georgia', serif; /* Example: A readable serif for instructions */
  font-size: 1.3rem;  /* ADJUST THIS for the overall text size in the orange box */
  line-height: 1.4;
}

/* --- Story Display Area Text Styling --- */
.story-content-text { /* Class for the div displaying storyContent */
  font-family: 'Didot', 'Georgia', 'Times New Roman', Times, serif; /* Your desired story font */
  font-size: 1.5rem;   /* ADJUST THIS - This makes the story text larger */
  line-height: 1.7;    /* Adjust for new font size */
  color: #111827;      /* Tailwind: text-gray-900 (very dark gray/near black) */
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}
/* Styles for h3 within story-display-container can be kept as Tailwind or moved here */
.story-display-container h3 {
  font-size: 1.25rem; /* text-xl */
  font-weight: 600;   /* font-semibold */
  color: #374151;    /* text-gray-700 */
}

/* --- User Input Textarea Styling --- */
.user-input-label {
  /* Tailwind: block text-lg font-medium text-gray-800 mb-2 */
  /* You can override or augment these with CSS if needed, e.g., font-family */
  font-family: 'Georgia', serif; /* Example: Consistent with instruction box text */
  font-size: 1.6rem;
  line-height: 1.7;
  font-weight: 600;
  color: #1f2937;
  display: block;
  margin-bottom: 0.5rem;
}

.user-input-textarea {
  /* Tailwind base: w-full border rounded px-3 py-2 */
  font-family: 'Didot', 'Times New Roman', serif; /* Choose your preferred input font */
  font-size: 1.4rem;  /* ADJUST THIS - This makes the user's input text larger */
  line-height: 1.6;
  color: #111827;     /* text-gray-900 */
}

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
