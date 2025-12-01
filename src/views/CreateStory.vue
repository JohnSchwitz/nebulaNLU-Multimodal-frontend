<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import { storeToRefs } from 'pinia'; // <-- THE CRITICAL MISSING IMPORT

// --- Pinia Store Setup ---
const authStore = useAuthStore();
// Use storeToRefs to create reactive references to the store's state and getters.
// This makes them usable in the template and keeps them reactive.
const {
  userId,
  isAuthenticated,
  userDisplayName: authUserName,
  isLoading: authIsLoading,
  error: authError
} = storeToRefs(authStore);

// --- Component State ---
const storyTellerInput = ref('');
const storyContent = ref('');
const storyName = ref('');
const sessionId = ref<string | null>(null);
const currentIteration = ref(0);
const isCompleted = ref(false);
const currentPlaceholder = ref('Type your story idea or continuation here...');
const aiSuggestionForNextTurn = ref('');
const initialGuidanceFromAPI = ref('');

// --- UI & Loading State ---
const loading = ref(false); // For AI generation
const isCompletingStory = ref(false);
const uploadLoading = ref(false); // For saving/PDF
const generationError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const uploadSuccessMessage = ref<string | null>(null);
const storyNameTouched = ref(false);

// --- Validation Constants ---
const MIN_PROMPT_LENGTH = 10;

// --- Computed Properties for UI Logic ---
const isStoryNameValid = computed(() => storyName.value.trim() !== '');
const showNameError = computed(() => storyNameTouched.value && !isStoryNameValid.value);
const isPromptValid = computed(() => storyTellerInput.value.trim().length >= MIN_PROMPT_LENGTH);

// --- API Calls ---
const generateStory = async () => {
  // Clean the input to remove leading/trailing whitespace and replace newlines with spaces.
  const cleanedInput = storyTellerInput.value.trim().replace(/\s+/g, ' ');
  if (!cleanedInput || !isAuthenticated.value) return;

  loading.value = true;
  generationError.value = null;

  try {
    let response;
    if (sessionId.value) {
      response = await api.continueStory({
        session_id: sessionId.value,
        feedback: cleanedInput,
      });
      storyContent.value += `\n\n${response.story}`;
    } else {
      response = await api.startStory({
        initial_prompt: cleanedInput,
      });
      sessionId.value = response.session_id;
      storyContent.value = response.story;
    }
    currentIteration.value = response.iteration || currentIteration.value + 1;
    aiSuggestionForNextTurn.value = response.next_prompt_for_user || '';
    storyTellerInput.value = '';
  } catch (error: any) {
    generationError.value = error.message || 'An unknown error occurred during story generation.';
  } finally {
    loading.value = false;
  }
};

const completeStory = async () => {
  if (!sessionId.value || !isAuthenticated.value) return;
  loading.value = true;
  isCompletingStory.value = true;
  generationError.value = null;

  try {
    const response = await api.completeStory({ session_id: sessionId.value });
    storyContent.value = response.full_story;
    isCompleted.value = true;
    currentIteration.value = response.iteration;
  } catch (error: any) {
    generationError.value = error.message || 'Failed to finalize the story.';
  } finally {
    loading.value = false;
    isCompletingStory.value = false;
  }
};

const uploadToDatabase = async () => {
  if (!isStoryNameValid.value || !storyContent.value || !isAuthenticated.value) return;
  uploadLoading.value = true;
  uploadError.value = null;
  uploadSuccessMessage.value = null;

  try {
    const response = await api.saveStory({
      story_name: storyName.value,
      story_content: storyContent.value,
      session_id: sessionId.value,
    });
    uploadSuccessMessage.value = response.message;
  } catch (error: any) {
    uploadError.value = error.message || 'An unknown error occurred while saving.';
  } finally {
    uploadLoading.value = false;
  }
};

const downloadAsPDF = async () => {
  if (!isStoryNameValid.value || !storyContent.value) return;
  try {
    const blob = await api.generateStoryPDF({
      story_name: storyName.value,
      story_content: storyContent.value,
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyName.value.replace(/ /g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error: any) {
    uploadError.value = `PDF Download Failed: ${error.message}`;
  }
};

// --- Lifecycle Hook ---
onMounted(async () => {
  console.log('[CreateStory.vue] Component mounted. Current auth status:', isAuthenticated.value);
  // This block handles the case where the user is ALREADY authenticated when they arrive,
  // for example, by navigating back to the page.
  if (isAuthenticated.value) {
    console.log('[CreateStory.vue] User is already authenticated. Fetching UI texts.');
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
      console.log('[CreateStory.vue] Successfully fetched initial guidance on mount.');
    } catch (error) {
      console.error("Failed to fetch UI texts, will use default guidance.", error);
      initialGuidanceFromAPI.value = "Welcome! Please enter your story idea below to begin.";
    }
  }
});

watch(isAuthenticated, async (newAuthStatus, oldAuthStatus) => {
  // This block handles the primary login flow where auth status changes from false to true.
  if (newAuthStatus === true && oldAuthStatus === false) {
    console.log('[CreateStory.vue] Auth status changed to TRUE. Fetching UI texts...');
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
      console.log('[CreateStory.vue] Successfully fetched initial guidance via watcher.');
    } catch (error) {
      console.error("Failed to fetch UI texts on auth change.", error);
      initialGuidanceFromAPI.value = "Welcome! Please enter your story idea below to begin.";
    }
  }
});
</script>

<template>
  <div class="create-story-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- =================================================== -->
    <!-- 1. Authentication Status Display                  -->
    <!-- =================================================== -->

    <!-- Show a loading message while the auth process is running -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Authenticating user, please wait...
    </div>

    <!-- Only render the rest of the page when auth is NOT loading -->
    <div v-else>
      <!-- Show an error if authentication failed -->
      <div v-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">
          <strong class="font-bold">Authentication Error:</strong> {{ authError }}. Please try logging in again.
        </span>
      </div>

      <!-- Show a login prompt if the user is not authenticated -->
      <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
         <span class="block sm:inline">
           Please log in via Ghost to create and save stories.
         </span>
      </div>

      <!-- =================================================== -->
      <!-- Main Story Creation Area (only if authenticated)  -->
      <!-- =================================================== -->
      <div v-if="isAuthenticated" class="story-creation-area mt-6">

        <!-- INSTRUCTION BOX / STATUS BOX (Orange Box) -->
        <div class="instruction-box my-4 p-4 rounded-md shadow-md" :style="{ backgroundColor: '#FFE086', color: 'black' }" role="status">
            <p class="instruction-box-greeting mb-2">
                Hello {{ authUserName || 'Storyteller' }}!
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

            <div v-if="!sessionId && currentIteration === 0" class="instruction-box-text">
                <p v-if="initialGuidanceFromAPI" v-html="initialGuidanceFromAPI.replace(/\n/g, '<br>')"></p>
                <p v-else>Enter your initial story idea to start our adventure!</p>
            </div>
            <div v-else-if="!isCompleted" class="instruction-box-text">
                <p v-if="aiSuggestionForNextTurn" class="italic">
                    <strong>Suggestion for your next contribution:</strong> "{{ aiSuggestionForNextTurn }}"
                </p>
                <p v-else>
                    What happens next? Add to the story or suggest a new direction!
                </p>
            </div>
            <div v-else class="instruction-box-text">
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

        <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
            {{ sessionId ? 'Continue Your Story' : 'Start a New Story' }}
        </h1>

        <div v-if="storyContent" class="story-display-container bg-white p-4 md:p-6 rounded shadow-md mb-6 border border-gray-200 min-h-[200px]">
          <h3 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Current Story Progress:</h3>
          <div class="story-content-text whitespace-pre-wrap">{{ storyContent }}</div>
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
            :class="{ 'border-red-500': storyTellerInput.length > 0 && !isPromptValid }"
          ></textarea>
          <p v-if="storyTellerInput.length > 0 && !isPromptValid" class="text-red-600 text-sm mt-1">
            Please enter at least {{ MIN_PROMPT_LENGTH }} characters.
          </p>
        </div>

        <!-- Action Buttons: Start/Continue/Complete -->
        <div v-if="!isCompleted" class="flex flex-wrap justify-center items-center gap-4 mb-6">
          <button
            @click="generateStory"
            :disabled="!isPromptValid || loading || !isAuthenticated"
            class="action-button primary-button"
            :title="!isAuthenticated ? 'Please log in first' : (!isPromptValid ? `Please enter at least ${MIN_PROMPT_LENGTH} characters` : (sessionId ? 'Continue with your input' : 'Start a new story with your idea'))"
            :data-testid="sessionId ? 'continue-story-button' : 'start-story-button'"
          >
            {{ (loading && !isCompletingStory) ? 'Generating...' : (sessionId ? 'Continue Story' : 'Start Story') }}
          </button>

          <button
              v-if="sessionId && !isCompleted"
              @click="completeStory"
              :disabled="loading || !isAuthenticated"
              class="action-button secondary-button"
              title="Ask the AI to write a final conclusion for the story"
              data-testid="complete-story-button"
          >
              {{ (loading && isCompletingStory) ? 'Finalizing...' : 'Complete Story' }}
          </button>
        </div>
        <!-- End Action Buttons -->

        <!-- Save Section (Show if story is marked complete) -->
        <div v-if="isCompleted" class="save-story-section mt-8 p-4 md:p-6 border-t border-gray-300 bg-gray-50 rounded-md">
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
                {{ uploadLoading ? 'Saving...' : 'Save Story to Database' }}
            </button>

            <button
                @click="downloadAsPDF"
                :disabled="!isStoryNameValid || !storyContent"
                class="action-button bg-gray-200 hover:bg-gray-300 text-gray-700"
                title="Download your story as a PDF file"
            >
                Download as PDF
            </button>
          </div>

          <div class="mt-4 text-center">
            <router-link to="/download" class="text-indigo-600 hover:text-indigo-800 hover:underline">
              View My Saved Stories
            </router-link>
          </div>
        </div> <!-- End Save Section -->

      </div> <!-- End v-if="isAuthenticated" for main content area -->
    </div> <!-- End v-else for auth loading -->
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
