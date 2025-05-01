<!-- CreateStory.vue -->
<template>
  <div class="max-w-4xl mx-auto px-4">
    <!-- User Info / Loading Message from Store -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600 font-didot">
      Loading user information...
    </div>
    <div v-else-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
      <span class="block sm:inline">
        <strong class="font-bold">Error:</strong> {{ authError }} Features requiring login may be disabled.
      </span>
    </div>
     <div v-else-if="userId" class="my-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
      <span class="block sm:inline">
        <strong class="font-bold">User Identified:</strong> {{ authUserName || 'User' }} ready. (Status: {{ authUserStatus || 'N/A' }})
      </span>
    </div>

    <!-- Rest of template -->
    <!-- ... -->
      <button
        @click="uploadToDatabase"
        :disabled="!isCompleted || !isStoryNameValid || !userId" <!-- Use userId from store -->
        class="..."
        title="Requires completed story, valid name, and user ID"
      > Upload to Database </button>
    <!-- ... -->
      <button
        @click="generateStory"
        :disabled="!storyTellerInput.trim() || loading || (!sessionId && !userId)" <!-- Check userId from store -->
        class="..."
      > {{ sessionId ? 'Continue Story' : 'Start Story' }} </button>
    <!-- ... -->

  </div>
  <!-- ... More template ... -->
</template>

<script setup> // <-- Use script setup
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth'; // <-- Import the auth store
import { storeToRefs } from 'pinia'; // <-- Import storeToRefs

// API URL setup
const API_URL = import.meta.env.VITE_APP_API_URL || 'http://127.0.0.1:5000';
axios.defaults.baseURL = API_URL;

// --- Pinia Auth Store ---
const authStore = useAuthStore();
// Make state properties reactive using storeToRefs
const {
    userId, // Now directly usable in template/script as reactive ref
    userStatus: authUserStatus,
    userName: authUserName,
    error: authError, // Renamed from store's error to avoid conflict
    isLoading: authIsLoading,
    isAuthenticated // Getter
} = storeToRefs(authStore);
// ------------------------

// --- Local Component State (Replicating original data properties as refs) ---
const storyPrompt = ref(`Create an ADVENTURE STORY with CHARACTERS, SETTING, ACTION, MOTIVATION, CHALLENGE and STORY LINE provided by the StoryTeller. Please introduce at least one SURPRISE CHARACTER to challenge the HERO and a PLOT TWIST. The Complete Story should require between 4 and 7 submissions of approximately 150 words from the StoryTeller. Each submission should continue the narrative from the previous. The Complete Story should be 1,000 to 1,500 words.`); // Keep your original prompt
const storyContent = ref("");
const storyName = ref("");
const messages = ref([]);
const storyTellerInput = ref("");
const sessionId = ref(null);
const currentIteration = ref(0);
const isCompleted = ref(false);
const isEditable = ref(false);

// Local error/success for component actions (distinct from authError)
const error = ref("");
const successMessage = ref("");
const loading = ref(false); // Local loading for component actions (API calls etc.)

// Image generation state
const showImageDialog = ref(false);
const imagePrompt = ref("");
const imageGenerating = ref(false);
const generatedImage = ref(null);
const imageDescription = ref(null);
// ---------------------------

// --- Computed Properties ---
const isStoryNameValid = computed(() => {
  // Ensure storyName is not empty and not just the placeholder text if you keep it
  return storyName.value && storyName.value.trim() !== "" && storyName.value.trim().toLowerCase() !== "story title";
});
// --------------------------

// --- Lifecycle Hooks ---
onMounted(() => {
  console.log("CreateStory component mounted.");
  // Call the action in the store to process URL params
  // Only do this if the user isn't already identified (e.g., from previous navigation)
  // And only if the specific param exists in the current URL search string
  if (!userId.value && window.location.search.includes('ghost_member_uuid')) {
      authStore.setUserInfoFromUrl(window.location.search);
  } else if (!userId.value) {
       console.warn("CreateStory mounted, but no user ID in store or URL params.");
       // The template already shows the authError if present
  } else {
       console.log("CreateStory mounted, user already identified in store:", userId.value);
  }

  // Initialize ScrollBox
  messages.value = [{ sender: 'AI', text: storyPrompt.value }];
});
// ----------------------

// --- Methods (Converted from original methods object) ---

const generateStory = async () => {
  // Check store's userId before starting a *new* story
  if (!sessionId.value && !userId.value) {
    error.value = "Cannot start story: User information is missing.";
    successMessage.value = "";
    return;
  }
  if (!storyTellerInput.value.trim()) return;

  loading.value = true;
  error.value = ""; // Clear previous errors
  successMessage.value = "";

  try {
    let response;
    const requestPayload = {}; // Build payload dynamically

    if (!sessionId.value) {
      // Starting a new story
      console.log('Starting new story with user_id:', userId.value);
      requestPayload.user_id = userId.value; // Use store's userId
      requestPayload.initial_prompt = storyTellerInput.value;
      requestPayload.system_prompt = storyPrompt.value;
      response = await axios.post(`/api/story/start`, requestPayload);
      sessionId.value = response.data.session_id;
    } else {
      // Continuing an existing story
      console.log('Continuing story session:', sessionId.value);
      requestPayload.session_id = sessionId.value;
      requestPayload.feedback = storyTellerInput.value;
      // Backend usually associates session_id with user, no need to resend user_id here generally
      response = await axios.post(`/api/story/continue`, requestPayload);
    }

    currentIteration.value = response.data.iteration;

    // Update the messages display
    messages.value.push({ sender: 'StoryTeller', text: storyTellerInput.value });
    messages.value.push({ sender: 'AI', text: response.data.story });

    // Append to storyContent for editing/saving later
    // Let's reconstruct the full story from AI messages unless it's the final "complete" one
    if (!response.data.complete) {
        storyContent.value = messages.value
            .filter(m => m.sender === 'AI') // Combine only AI responses for the full story
            .map(m => m.text.replace(/^COMPLETE STORY:\s+/i, '')) // Remove "COMPLETE STORY:" prefix if present
            .join("\n\n");
    } else {
        storyContent.value = response.data.story; // Use the explicitly completed story
    }


    isCompleted.value = response.data.complete;
    if (isCompleted.value) {
      isEditable.value = true; // Allow editing after completion
      // Maybe add a system message indicating completion?
       if (!messages.value.some(m => m.sender === 'System' && m.text.includes('Marked as Complete'))) {
            messages.value.push({ sender: 'System', text: '--- Story Marked as Complete (ScrollBox content may differ) ---'});
       }
    }

    storyTellerInput.value = ""; // Clear input field

  } catch (err) {
    console.error("API Error generating story:", err.response?.data || err.message);
    error.value = `Failed to ${sessionId.value ? 'continue' : 'start'} story. ${err.response?.data?.error || 'Please try again.'}`;
  } finally {
    loading.value = false;
  }
};

const completeStory = async () => {
  if (!sessionId.value) {
    error.value = "Please start a story first.";
    successMessage.value = "";
    return;
  }
  loading.value = true;
  error.value = "";
  successMessage.value = "";

  try {
    const response = await axios.post(`/api/story/complete`, {
      session_id: sessionId.value
    });

    // Update the content with the *final* complete story
    storyContent.value = response.data.story;
    currentIteration.value = response.data.iteration;
    isCompleted.value = true;
    isEditable.value = true; // Allow editing after final completion

    // Replace messages with just the final story for clarity, or add a marker
    messages.value = messages.value.filter(m => m.sender !== 'System' && !m.text.startsWith('COMPLETE STORY:')); // Clear old system/complete messages
    messages.value.push({ sender: 'AI', text: "COMPLETE STORY:\n\n" + response.data.story });
    messages.value.push({ sender: 'System', text: '--- Story Finalized ---'});

    successMessage.value = "Story completed! You can now save, download PDF, or generate an image.";
    setTimeout(() => { successMessage.value = ""; }, 6000);

  } catch (err) {
    console.error('API Error completing story:', err.response?.data || err.message);
    error.value = `Failed to complete story. ${err.response?.data?.error || 'Please try again.'}`;
  } finally {
    loading.value = false;
  }
};

const uploadToDatabase = async () => {
  // Check store's userId
  if (!userId.value) {
    error.value = "Cannot save story: User is not identified.";
    successMessage.value = "";
    return;
  }
  if (!isCompleted.value) {
    error.value = "Please complete the story using the 'Complete Story' button before saving.";
    successMessage.value = "";
    return;
  }
  if (!isStoryNameValid.value) {
    error.value = "Please provide a valid Story Name before saving.";
    successMessage.value = "";
    return;
  }
   if (!storyContent.value || !storyContent.value.trim()) {
     error.value = "Cannot save empty story content.";
     successMessage.value = "";
     return;
   }


  loading.value = true;
  error.value = "";
  successMessage.value = "";

  try {
    console.log(`Uploading story "${storyName.value.trim()}" for user_id: ${userId.value}`);
    // IMPORTANT: Send the *final* completed story content
    await axios.post(`/api/story/save`, {
      user_id: userId.value, // Use store's userId
      story_name: storyName.value.trim(),
      story_content: storyContent.value, // Send the final story content
    });
    successMessage.value = `Story "${storyName.value.trim()}" saved successfully!`;
    setTimeout(() => { successMessage.value = ""; }, 5000);
  } catch (err) {
    console.error("API Error saving story:", err.response?.data || err.message);
    error.value = `Failed to save story. ${err.response?.data?.error || 'Server error. Please try again.'}`;
  } finally {
    loading.value = false;
  }
};

const downloadPDF = async () => {
  if (!isCompleted.value) {
    error.value = "Please complete the story first.";
    successMessage.value = "";
    return;
  }
  if (!storyContent.value || !storyContent.value.trim()) {
    error.value = "Story content is empty, cannot generate PDF.";
    successMessage.value = "";
    return;
  }

  loading.value = true;
  error.value = "";
  successMessage.value = "";

  try {
    const storyTitle = (storyName.value || "My Story").trim();
    // Send the *final* completed story content for the PDF
    const response = await axios.post(`/api/pdf/story`, {
      story_name: storyTitle,
      story_content: storyContent.value // Use final content
    }, {
      responseType: 'blob' // Important for file download
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    const downloadName = `${storyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'story'}.pdf`;
    link.setAttribute('download', downloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    successMessage.value = "PDF download started.";
    setTimeout(() => { successMessage.value = ""; }, 4000);

  } catch (err) {
    console.error('API Error generating PDF:', err.response?.data || err.message);
    let errorMsg = "Failed to generate PDF. Please try again.";
    try { // Try to parse error from blob if backend returns JSON error in blob
        if (err.response?.data instanceof Blob && err.response.data.type === "application/json") {
            const errJson = JSON.parse(await err.response.data.text());
            errorMsg = `Failed to generate PDF: ${errJson.error || 'Server error.'}`;
        } else if (err.response?.data?.error) {
            errorMsg = `Failed to generate PDF: ${err.response.data.error}`;
        }
    } catch (parseError) { /* Ignore blob parsing errors */ }
    error.value = errorMsg;
  } finally {
    loading.value = false;
  }
};

// --- Image Methods ---
const openImageDialog = () => {
  if (!isCompleted.value) {
    error.value = "Please complete the story first before generating an image.";
    successMessage.value = "";
    return;
  }
  // Suggest based on final story content
  if (!imagePrompt.value && storyContent.value) {
    imagePrompt.value = `Create an image depicting a key scene from the story: ${storyContent.value.substring(0, 150)}...`; // Suggest based on final story
  } else if (!imagePrompt.value) {
    imagePrompt.value = `Visually represent the main theme or characters of the completed story.`;
  }
  showImageDialog.value = true;
  error.value = ""; // Clear errors when opening dialog
  successMessage.value = "";
};

const closeImageDialog = () => {
  showImageDialog.value = false;
  // Maybe clear prompt on close?
  // imagePrompt.value = "";
};

const generateImage = async () => {
  if (!imagePrompt.value.trim()) { return; }
  // Check store's userId
  if (!userId.value) {
    error.value = "Cannot generate image: User not identified.";
    // Close dialog and show error?
    // closeImageDialog();
    return;
  }
   if (!isCompleted.value || !storyContent.value) {
     error.value = "Cannot generate image: Story is not completed or content is missing.";
     return;
   }

  imageGenerating.value = true; // Use specific loading state for image gen
  error.value = "";
  successMessage.value = "";

  try {
    const response = await axios.post(`/api/image/generate-from-story`, {
      user_id: userId.value, // Use store's userId
      story_text: storyContent.value, // Send final completed story content
      specific_description: imagePrompt.value
    });

    if (response.data.success && response.data.image_url) {
      generatedImage.value = response.data.image_url;
      imageDescription.value = response.data.visual_description || imagePrompt.value; // Use generated desc or fallback to prompt
      successMessage.value = "Image generated successfully!";
      setTimeout(() => { successMessage.value = ""; }, 5000);
      closeImageDialog(); // Close dialog on success
    } else {
      throw new Error(response.data.message || response.data.error || "Failed to generate image (unknown error)");
    }
  } catch (err) {
    console.error("API Error generating image:", err.response?.data || err.message);
    // Show error message near image generation area or globally
    error.value = `Image generation failed: ${err.message || 'Server error. Please try again.'}`;
    // Optionally, re-open dialog or show error within it? For now, global error.
    // Don't close dialog on error
  } finally {
    imageGenerating.value = false;
  }
};

// --- Reset Method ---
const resetStory = () => {
  // Keep user ID and status when resetting, clear authError if any remains
  authStore.clearAuthError();

  // Reset story-specific local state
  sessionId.value = null;
  currentIteration.value = 0;
  storyContent.value = "";
  isCompleted.value = false;
  isEditable.value = false;
  messages.value = [{ sender: 'AI', text: storyPrompt.value }]; // Re-add initial prompt
  storyTellerInput.value = "";
  generatedImage.value = null;
  imageDescription.value = "";
  storyName.value = "";
  error.value = "";
  successMessage.value = "";
  loading.value = false; // Ensure loading state is reset
  imageGenerating.value = false;
  showImageDialog.value = false;
  imagePrompt.value = ""; // Also clear image prompt
  console.log("Story state reset.");
};
// ------------------

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
