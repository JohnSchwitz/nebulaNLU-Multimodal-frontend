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
          :style="{ backgroundColor: '#FF8F07', color: 'black' }"
          role="status">
      <p class="font-bold text-lg mb-2">
        {{ authUserName || 'StoryTeller' }}, let's begin!
      </p>
      <p v-if="!storyContent && !sessionId" class="text-sm">
        Create an ADVENTURE STORY with CHARACTERS, SETTING, ACTION, MOTIVATION, CHALLENGE and STORY LINE provided by you, the StoryTeller.
        I will introduce at least one SURPRISE CHARACTER to challenge the HERO and a PLOT TWIST.
        You can respond to my additional prompts to revise or continue your story.
        When ready, hit the COMPLETE STORY button which allows saving your story and an option to download a PDF.
      </p>
      <p v-else class="text-sm">
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
       <div v-else class="text-center text-gray-500 mb-6 italic">
           Your generated story will appear here after your first prompt.
       </div>


      <!-- Input Area for User Prompt/Feedback -->
      <div class="mb-4">
        <label for="storyInput" class="block text-lg font-medium text-gray-800 mb-2">
          {{ sessionId ? 'Your turn! What happens next, or how should we change the story?' : 'Enter your initial story idea or prompt:' }}
        </label>
        <textarea
          id="storyInput"
          v-model="storyTellerInput"
          rows="5"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md p-3 font-sans"
          :placeholder="sessionId ? 'e.g., Hazel bravely steps forward...\nOr: Change the dragon to be misunderstood.' : 'e.g., A young knight named Arthur discovers a hidden map...'"
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

         <div v-if="uploadError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
           <span class="block sm:inline"><strong class="font-bold">Upload Error:</strong> {{ uploadError }}</span>
         </div>
          <div v-if="uploadSuccessMessage" class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
           <span class="block sm:inline"><strong class="font-bold">Success!</strong> {{ uploadSuccessMessage }}</span>
         </div>
      </div>
    </div> <!-- End v-if="isAuthenticated" -->
  </div>
</template>

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

async function generateStory() {
  if (!storyTellerInput.value.trim() || !isAuthenticated.value ) return;
  loading.value = true;
  isCompletingStory.value = false;
  generationError.value = null;
  uploadSuccessMessage.value = null;
  uploadError.value = null;
  // isCompleted.value = false; // Only set to false if continuing, not if starting a new "complete" story

  try {
    let responseData;
    let promptForApi = storyTellerInput.value;

    if (!sessionId.value) { // START NEW STORY
      isCompleted.value = false; // Ensure new story starts as not completed
      // Prepend system instructions to the user's very first prompt
      promptForApi = `${geminiSystemInstructions}\n\nStoryteller's idea: ${storyTellerInput.value}`;

      const payload = { initial_prompt: promptForApi };
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
      const payload = { session_id: sessionId.value, feedback: promptForApi };
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
  loading.value = true;
  isCompletingStory.value = true;
  generationError.value = null;

  try {
    console.log("Calling api.completeStory for session:", sessionId.value);
    const responseData = await api.completeStory(sessionId.value);

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

  uploadLoading.value = true;
  uploadError.value = null;
  uploadSuccessMessage.value = null;

  const storyData = {
    story_name: storyName.value.trim(),
    story_content: storyContent.value, // Save the final, potentially completed story
    sessionId: sessionId.value // Optional: link to original session
  };

  console.log("Calling api.saveStory with data:", storyData);
  try {
    const response = await api.saveStory(storyData);
    console.log("Upload response:", response);
    uploadSuccessMessage.value = response.message || `Story "${storyData.story_name}" saved successfully!`;
    // Optionally clear sessionId and other states if saving means this draft is "done"
    // sessionId.value = null;
    // isCompleted.value = false; // Or true if saving implies a new state of completion
    // storyContent.value = ""; // Or keep it displayed
    // storyName.value = "";
  } catch (error) {
    console.error("Error uploading story:", error);
    uploadError.value = error.message || 'An unknown error occurred during upload.';
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

onMounted(() => {
  if (authStore.isAuthenticated) {
    console.log('CreateStory - onMounted: User already authenticated.');
    return;
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
.instruction-dialog {
    margin-bottom: 20px;
  text-align: left;
}
textarea {
    width: 100%;
     box-sizing: border-box;
}
.chatbox{
   border: 1px solid black;
   min-height: 100px;
    max-height: 300px;
    overflow-y: scroll;
    padding: 10px;
    margin-bottom: 10px;
   background-color: gray;
}
.message-text {
  color: white;
  text-align: left;
}
.AI{
  color: blue;
   font-weight: bold;
  text-align: left;
}
.StoryTeller {
 color: #FF8f07;
   font-weight: bold;
    text-align: left;
}
.instructions-area {
   margin-top: 20px;
    text-align: center;
}
.input-area {
   display: flex;
    align-items: center;
  width: 100%;
    margin-bottom: 10px;
}
.input-area textarea {
   flex: 1;
   margin-right: 10px;
   background-color: white;
}
.bottom-area {
   display: flex;
    align-items: center;
}
.story-name-input {
   flex: 0 0 200px; /* Limit the input to a specific size */
  margin-right: 10px;
}
.scrollbox-label {
  text-align: center;
  margin-bottom: 5px;
   font-weight: bold;
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

.bg-chatbox-light textarea {
    min-height: 200px;
}
</style>

