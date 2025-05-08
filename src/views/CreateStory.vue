<!-- CreateStory.vue -->
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
     <div v-else-if="userId" class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="status">
      <span class="block sm:inline">
        <strong class="font-bold">User Identified:</strong> {{ authUserName || 'User' }} ready. <!-- (UUID: {{ userId }}) -->
      </span>
    </div>

    <!-- =================================================== -->
    <!-- 2. Main Story Creation Area (only if authenticated) -->
    <!-- =================================================== -->
    <div v-if="isAuthenticated" class="story-creation-area mt-4">
      <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">Create Your Story</h1>

      <!-- Display Area for Generated Story Content -->
      <div v-if="storyContent" class="story-display bg-white p-4 md:p-6 rounded shadow-md mb-6 border border-gray-200 min-h-[200px]">
        <h3 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Current Story Draft:</h3>
        <!-- Use pre for preserving whitespace and newlines from the AI -->
        <pre class="whitespace-pre-wrap font-sans text-gray-800 text-base leading-relaxed">{{ storyContent }}</pre>
        <!-- Display completion status -->
         <p v-if="isCompleted" class="mt-4 text-green-600 font-semibold">Story marked as complete. You can now name and save it below.</p>
      </div>
       <div v-else class="text-center text-gray-500 mb-6 italic">
           Your generated story will appear here.
       </div>


      <!-- Input Area for User Prompt/Feedback -->
      <div class="mb-4">
        <label for="storyInput" class="block text-lg font-medium text-gray-800 mb-2">
          {{ sessionId ? 'Provide feedback or describe the next part:' : 'Enter your initial story idea or prompt:' }}
        </label>
        <textarea
          id="storyInput"
          v-model="storyTellerInput"
          rows="5"
          class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full text-base border-gray-300 rounded-md p-3 font-sans"
          :placeholder="sessionId ? 'e.g., The dragon roars! What does Hazel do?\nOr maybe: Introduce a friendly gnome.' : 'e.g., A young astronaut finds a mysterious signal on Mars...'"
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
          <!-- Loading Spinner -->
          <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? 'Generating...' : (sessionId ? 'Continue Story' : 'Start Story') }}
        </button>

        <!-- Show "Complete Story" button only if a session exists and story isn't already marked complete -->
        <button
            v-if="sessionId && !isCompleted"
            @click="completeStory"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ask the AI to finalize the story"
        >
            Finalize Complete Story
        </button>
      </div>

       <!-- Display Generation Errors -->
       <div v-if="generationError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
         <span class="block sm:inline">
           <strong class="font-bold">Generation Error:</strong> {{ generationError }}
         </span>
       </div>

      <!-- Save Section (Conditional) -->
      <div v-if="isCompleted || (storyContent && !sessionId)" class="mt-8 p-4 md:p-6 border-t border-gray-300 bg-gray-50 rounded-md">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">Save Your Story</h3>
        <div class="mb-4">
            <label for="storyName" class="block text-sm font-medium text-gray-800 mb-1">Story Name:</label>
            <input
                type="text"
                id="storyName"
                v-model="storyName"
                required
                class="shadow-sm focus:ring-green-500 focus:border-green-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 font-sans"
                placeholder="Enter a name for your masterpiece"
                aria-required="true"
            />
             <!-- Basic validation feedback -->
             <p v-if="showNameError" class="text-red-600 text-sm mt-1">Please enter a name for your story.</p>
        </div>

        <button
            @click="uploadToDatabase"
            :disabled="!isStoryNameValid || uploadLoading || !isAuthenticated"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save the final story content to your account"
        >
            <!-- Loading Spinner for Upload -->
            <svg v-if="uploadLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ uploadLoading ? 'Saving...' : 'Save Story to Database' }}
        </button>

         <!-- Display Upload Feedback -->
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
// Import necessary functions/stores
// *** ADD onMounted HERE ***
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth'; // Adjust path if needed
import { storeToRefs } from 'pinia';
import api from '@/services/api'; // Adjust path if needed

// Pinia Store for Auth
const authStore = useAuthStore();
const { userId, authUserName, authUserStatus, authError, authIsLoading, isAuthenticated } = storeToRefs(authStore);

// Component State (Existing state remains the same)
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

// Computed Property for Name Validation (Existing computed remains the same)
const isStoryNameValid = computed(() => storyName.value.trim().length > 0);
const showNameError = computed(() => storyNameTouched.value && !isStoryNameValid.value);


// --- Methods (Existing methods remain the same) ---
async function generateStory() {
  // ... your existing generateStory logic ...
  // (Make sure to replace simulation blocks with actual API calls)
  if (!storyTellerInput.value.trim() || !isAuthenticated.value) return;
  loading.value = true;
  generationError.value = null;
  uploadSuccessMessage.value = null;
  uploadError.value = null;
  isCompleted.value = false;

  try {
    // Replace simulation with actual API calls using 'api' object
    // e.g., const responseData = await api.startStoryOrContinue(...)
    console.log("Simulating generateStory call...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!sessionId.value) {
        storyContent.value = `(Simulation) Started: ${storyTellerInput.value}`;
        sessionId.value = `sim-${Date.now()}`;
    } else {
        storyContent.value += `\n(Simulation) Continued: ${storyTellerInput.value}`;
    }
    storyTellerInput.value = '';
  } catch(e) {
      console.error("Error in generateStory:", e);
      generationError.value = e.message || "Failed to generate story.";
  } finally {
      loading.value = false;
  }
}

async function completeStory() {
  // ... your existing completeStory logic ...
  // (Make sure to replace simulation blocks with actual API calls)
   if (!sessionId.value || loading) return;
   loading.value = true;
   generationError.value = null;
   console.log(`Simulating completeStory call for session ${sessionId.value}`);
   try {
       await new Promise(resolve => setTimeout(resolve, 1000));
       storyContent.value += "\n(Simulation) The End.";
       isCompleted.value = true;
       storyTellerInput.value = '';
   } catch(e) {
       console.error("Error in completeStory:", e);
       generationError.value = e.message || "Failed to complete story.";
   } finally {
       loading.value = false;
   }
}

async function uploadToDatabase() {
  // ... your existing uploadToDatabase logic ...
  // (Make sure to replace simulation blocks with actual API calls)
  storyNameTouched.value = true;
  if (!isStoryNameValid.value || !isAuthenticated.value || !storyContent.value) return;
  uploadLoading.value = true;
  uploadError.value = null;
  uploadSuccessMessage.value = null;
  const storyData = {
    story_name: storyName.value.trim(),
    story_content: storyContent.value
  };
  console.log("Simulating uploadToDatabase call:", storyData);
  try {
      const response = await api.saveStory(storyData); // Use the actual API call
      console.log("Upload response:", response);
      uploadSuccessMessage.value = response.message || `Story "${storyData.story_name}" saved successfully!`;
  } catch (error) {
      console.error("Error uploading story:", error);
      uploadError.value = error.message || 'An unknown error occurred during upload.';
  } finally {
      uploadLoading.value = false;
  }
}

// Watch for auth changes (Existing watch remains the same)
watch(isAuthenticated, (isAuth) => {
  if (!isAuth) {
    // Reset component state if user logs out while viewing
    storyTellerInput.value = '';
    storyContent.value = '';
    loading.value = false;
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

// *** --- START: ADD onMounted Hook --- ***
onMounted(() => {
  // Check if user is already authenticated in the store (e.g., from a previous session)
  if (authStore.isAuthenticated) {
    console.log('CreateStory - onMounted: User already authenticated in store. Skipping query param check.');
    return; // Don't re-process if already logged in
  }

  console.log('CreateStory - onMounted: Component mounted. Checking for Ghost redirect query parameters...');
  const urlParams = new URLSearchParams(window.location.search);
  const ghostMemberUUID = urlParams.get('ghost_member_uuid');
  const ghostMemberEmail = urlParams.get('ghost_member_email');
  const ghostMemberName = urlParams.get('ghost_member_name');
  const ghostMemberStatus = urlParams.get('ghost_member_status');
  const ghostMemberTier = urlParams.get('ghost_member_tier');

  console.log('CreateStory - onMounted: Query params found:', {
      uuid: ghostMemberUUID,
      email: ghostMemberEmail,
      name: ghostMemberName,
      status: ghostMemberStatus,
      tier: ghostMemberTier
  });

  if (ghostMemberUUID) {
    console.log('CreateStory - onMounted: Ghost member UUID found in URL. Updating auth store.');

    // --- Action Call to Pinia Store ---
    // Call an action in your Pinia store to update the state.
    // The action should handle setting isAuthenticated, userId, userName, etc.
    // Replace 'processGhostLogin' with the actual name of your action.
    try {
       authStore.processGhostLogin({ // Example action name
         userId: ghostMemberUUID, // Send UUID as userId
         userName: ghostMemberName || null, // Send name or null
         userEmail: ghostMemberEmail || null, // Send email or null
         userStatus: ghostMemberStatus || null, // Send status or null
         userTier: ghostMemberTier || null // Send tier or null
         // The action in the store should set isAuthenticated = true
       });
       console.log('CreateStory - onMounted: Auth store update dispatched.');

        // Optional: Remove query parameters from URL after processing
        // This cleans up the address bar. Use with caution if deep linking relies on params.
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('CreateStory - onMounted: Cleared query parameters from URL.');

    } catch (error) {
        console.error("CreateStory - onMounted: Error calling Pinia store action:", error);
        // Update the authError state in Pinia if the action fails
        authStore.setError('Failed to process login information.');
    }
    // --- End Action Call ---

  } else {
    console.log('CreateStory - onMounted: No Ghost member UUID found in query parameters. Waiting for manual login or other auth methods.');
    // No action needed here, the template's v-if/v-else-if will handle showing the appropriate message
    // based on the initial (likely false) isAuthenticated state from the store.
  }
});
// *** --- END: ADD onMounted Hook --- ***

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
.container { /* Add some overall padding */
  padding-bottom: 3rem;
}
/* Basic spinner */
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
 color: green;
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

/* Add some explicit height/styles for textarea inside scrollbox if needed */
.bg-chatbox-light textarea {
    min-height: 200px; /* Ensure textarea takes up space */
}
</style>
