<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import api from '@/services/api';

// PINIA STORE
const authStore = useAuthStore();
const {
  isAuthenticated,
  userId,
  userName: authUserName,
  isLoading: authIsLoading,
  error: authError
} = storeToRefs(authStore);

// STATE
const storyTellerInput = ref('');
const storyContent = ref('');
const storyName = ref('');
const sessionId = ref<string | null>(null);
const currentIteration = ref(0);
const isCompleted = ref(false);
const currentPlaceholder = ref('Type your story idea or continuation here...');
const aiSuggestionForNextTurn = ref('');
const initialGuidanceFromAPI = ref('');
const loading = ref(false);
const isCompletingStory = ref(false);
const uploadLoading = ref(false);
const generationError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const uploadSuccessMessage = ref<string | null>(null);
const storyNameTouched = ref(false);

// VALIDATION
const MIN_PROMPT_LENGTH = 10;
const isStoryNameValid = computed(() => storyName.value.trim() !== '');
const showNameError = computed(() => storyNameTouched.value && !isStoryNameValid.value);
const isPromptValid = computed(() => storyTellerInput.value.trim().length >= MIN_PROMPT_LENGTH);
const processedGuidance = computed(() => {
  const userName = authUserName.value || 'Storyteller';
  return initialGuidanceFromAPI.value.replace(/\{\{name\}\}/g, userName);
});

// UTILITIES
const cleanStory = (rawStory: string): { story: string; prompt: string } => {
  const parts = rawStory.split(/NEXT_PROMPT:\s*/i);
  if (parts.length > 1) {
    return { story: parts[0].trim(), prompt: parts.slice(1).join('NEXT_PROMPT:').trim() };
  }
  return { story: rawStory.trim(), prompt: '' };
};

const formatSuggestion = (suggestion: string): string => {
  const paragraphs = suggestion.split(/\n\n+/);
  return paragraphs
    .map((para, index) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      if (index === 0) {
        return `<p class="mb-3 text-gray-800 leading-relaxed">${trimmed}</p>`;
      }
      return `<p class="mb-2 text-gray-700 leading-relaxed italic">${trimmed}</p>`;
    })
    .filter(p => p)
    .join('');
};

// GENERATE STORY
const generateStory = async () => {
  const cleanedInput = storyTellerInput.value.trim();
  if (!cleanedInput || !isAuthenticated.value) return;

  loading.value = true;
  generationError.value = null;

  try {
    let response;

    if (sessionId.value) {
      console.log('📝 Continuing story');
      response = await api.continueStory({
        session_id: sessionId.value,
        feedback: cleanedInput,
      });

      // APPEND to existing story
      if (response.next_prompt_for_user) {
        storyContent.value = storyContent.value + `\n\n${response.story}`;
        aiSuggestionForNextTurn.value = response.next_prompt_for_user;
      } else {
        const { story, prompt } = cleanStory(response.story);
        storyContent.value = storyContent.value + `\n\n${story}`;
        aiSuggestionForNextTurn.value = prompt;
      }

    } else {
      console.log('🆕 Starting story');
      response = await api.startStory({ initial_prompt: cleanedInput });

      // SET story first time
      sessionId.value = response.session_id;

      if (response.next_prompt_for_user) {
        storyContent.value = response.story;
        aiSuggestionForNextTurn.value = response.next_prompt_for_user;
      } else {
        const { story, prompt } = cleanStory(response.story);
        storyContent.value = story;
        aiSuggestionForNextTurn.value = prompt;
      }
    }

    currentIteration.value = response.iteration || currentIteration.value + 1;
    storyTellerInput.value = '';
    console.log('✅ Story generated -', storyContent.value.length, 'chars');

  } catch (error: any) {
    console.error('❌ Error:', error);
    generationError.value = error.message || 'Story generation failed';
  } finally {
    loading.value = false;
  }
};

// COMPLETE STORY
const completeStory = async () => {
  if (!sessionId.value || !isAuthenticated.value) return;

  loading.value = true;
  isCompletingStory.value = true;
  generationError.value = null;

  try {
    console.log('🏁 Completing story');
    console.log('📊 BEFORE completion - storyContent length:', storyContent.value.length);

    const response = await api.completeStory({ session_id: sessionId.value });

    console.log('📊 Backend response.full_story length:', response.full_story?.length || 0);

    // Backend returns COMPLETE story
    let finalStory = response.full_story || storyContent.value;

    // Remove ALL occurrences of NEXT_PROMPT and everything after each one
    // Split by NEXT_PROMPT, keep only story parts, rejoin
    const storyParts = finalStory.split(/NEXT_PROMPT:[^\n]*(\n\n|$)/gi);
    finalStory = storyParts.join('\n\n').trim();

    storyContent.value = finalStory;
    isCompleted.value = true;
    currentIteration.value = response.iteration;

    console.log('📊 AFTER completion - storyContent length:', storyContent.value.length);
    console.log('✅ Story completed');

  } catch (error: any) {
    console.error('❌ Error:', error);
    generationError.value = error.message || 'Failed to complete story';
  } finally {
    loading.value = false;
    isCompletingStory.value = false;
  }
};

// SAVE STORY
const uploadToDatabase = async () => {
  if (!isStoryNameValid.value || !storyContent.value || !isAuthenticated.value) return;

  uploadLoading.value = true;
  uploadError.value = null;
  uploadSuccessMessage.value = null;

  try {
    console.log('💾 Saving story:', storyName.value);
    const response = await api.saveStory({
      story_name: storyName.value,
      story_content: storyContent.value,
      session_id: sessionId.value,
    });
    uploadSuccessMessage.value = response.message;
    console.log('✅ Saved');
  } catch (error: any) {
    console.error('❌ Error:', error);
    uploadError.value = error.message || 'Save failed';
  } finally {
    uploadLoading.value = false;
  }
};

// DOWNLOAD PDF
const downloadAsPDF = async () => {
  if (!isStoryNameValid.value || !storyContent.value) return;

  try {
    console.log('📄 Generating PDF');
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
    console.log('✅ PDF downloaded');
  } catch (error: any) {
    console.error('❌ Error:', error);
    uploadError.value = `PDF failed: ${error.message}`;
  }
};

// LIFECYCLE
onMounted(async () => {
  console.log('[CreateStory] Mounted');
  if (isAuthenticated.value) {
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
      console.log('✅ UI texts loaded');
    } catch (error) {
      console.error('❌ Failed:', error);
      initialGuidanceFromAPI.value = "Welcome {{name}}! Start your story.";
    }
  }
});

watch(isAuthenticated, async (newAuth, oldAuth) => {
  if (newAuth === true && oldAuth === false) {
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
      console.log('✅ UI texts loaded');
    } catch (error) {
      console.error('❌ Failed:', error);
      initialGuidanceFromAPI.value = "Welcome {{name}}! Start your story.";
    }
  }
});

watch(authUserName, (newName) => {
  console.log('User name:', newName);
});
</script>

<template>
  <div class="create-story-page max-w-4xl mx-auto p-4 md:p-6 font-didot">

    <!-- ========================================= -->
    <!-- AUTHENTICATION STATUS DISPLAY             -->
    <!-- ========================================= -->

    <!-- Loading state -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Authenticating user, please wait...
    </div>

    <!-- Main content (only when not loading) -->
    <div v-else>

      <!-- Authentication error -->
      <div v-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">
          <strong class="font-bold">Authentication Error:</strong> {{ authError }}. Please try logging in again.
        </span>
      </div>

      <!-- Not authenticated prompt -->
      <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
        <span class="block sm:inline">
          Please log in via Ghost to create and save stories.
        </span>
      </div>

      <!-- ========================================= -->
      <!-- MAIN STORY CREATION AREA                  -->
      <!-- (Only shown when authenticated)           -->
      <!-- ========================================= -->
      <div v-if="isAuthenticated" class="story-creation-area mt-6">

        <!-- INSTRUCTION BOX (Orange Box) -->
        <div class="instruction-box my-4 p-4 rounded-md shadow-md" style="background-color: #FFE086; color: black;" role="status">

          <!-- Greeting -->
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

          <!-- Guidance text -->
          <div v-if="!sessionId && currentIteration === 0" class="instruction-box-text">
            <p v-if="initialGuidanceFromAPI" v-html="processedGuidance.replace(/\n/g, '<br>')"></p>
            <p v-else>Enter your initial story idea to start our adventure!</p>
          </div>

          <!-- Enhanced (formats multi-paragraph suggestions) -->
          <div v-else-if="!isCompleted" class="instruction-box-text">
            <div v-if="aiSuggestionForNextTurn" class="ai-suggestion">
              <p class="font-semibold mb-2">💡 Ideas for Your Next Turn:</p>
              <div class="suggestion-content" v-html="formatSuggestion(aiSuggestionForNextTurn)"></div>
            </div>
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

        <!-- Loading spinner -->
        <div v-if="loading || uploadLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="spinner"></div>
          <p class="text-white ml-3 text-lg">
            {{ loading && !isCompletingStory ? 'Generating Story...' :
               loading && isCompletingStory ? 'Finalizing Story...' :
               uploadLoading ? 'Saving...' : 'Processing...' }}
          </p>
        </div>

        <!-- Error/Success Messages -->
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

        <!-- Page Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800">
          {{ sessionId ? 'Continue Your Story' : 'Start a New Story' }}
        </h1>

        <!-- Story Display -->
        <div v-if="storyContent" class="story-display-container bg-white p-4 md:p-6 rounded shadow-md mb-6 border border-gray-200 min-h-[200px]">
          <h3 class="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Current Story Progress:</h3>
          <div class="story-content-text whitespace-pre-wrap">{{ storyContent }}</div>
          <p v-if="isCompleted && storyContent" class="mt-4 text-green-600 font-semibold">
            This story is now complete! You can save it or download it as a PDF below.
          </p>
        </div>

        <!-- User Input Area (only if story not completed) -->
        <div v-if="!isCompleted" class="mb-4">
          <label for="story-teller-input" class="user-input-label block mb-2">
            {{ sessionId ?
               (aiSuggestionForNextTurn ? 'Respond to AI or add your own idea:' :
                'Your turn! What happens next, or how should we change the story?') :
               'Enter your initial story idea to begin:' }}
          </label>
          <textarea
            id="story-teller-input"
            v-model="storyTellerInput"
            :placeholder="aiSuggestionForNextTurn || currentPlaceholder"
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
            class="action-button primary-button px-6 py-3 rounded-lg font-semibold transition-colors"
            :title="!isAuthenticated ? 'Please log in first' :
                   (!isPromptValid ? `Please enter at least ${MIN_PROMPT_LENGTH} characters` :
                   (sessionId ? 'Continue with your input' : 'Start a new story with your idea'))"
            :data-testid="sessionId ? 'continue-story-button' : 'start-story-button'"
          >
            {{ (loading && !isCompletingStory) ? 'Generating...' : (sessionId ? 'Continue Story' : 'Start Story') }}
          </button>

          <button
            v-if="sessionId && !isCompleted"
            @click="completeStory"
            :disabled="loading || !isAuthenticated"
            class="action-button secondary-button px-6 py-3 rounded-lg font-semibold transition-colors"
            title="Ask the AI to write a final conclusion for the story"
            data-testid="complete-story-button"
          >
            {{ (loading && isCompletingStory) ? 'Finalizing...' : 'Complete Story' }}
          </button>
        </div>

        <!-- Save Section (only if story completed) -->
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
              class="action-button bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              title="Save this story to your account"
            >
              {{ uploadLoading ? 'Saving...' : 'Save Story to Database' }}
            </button>

            <button
              @click="downloadAsPDF"
              :disabled="!isStoryNameValid || !storyContent"
              class="action-button bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
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
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
@font-face {
  font-family: 'Didot';
  src: url('@/assets/fonts/TheanoDidot-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.create-story-page {
  font-family: 'Didot', 'Bodoni MT', 'Hoefler Text', Garamond, 'Times New Roman', serif;
}

.instruction-box {
  font-family: 'Georgia', serif;
  font-size: 1.3rem;
  line-height: 1.4;
}

.story-content-text {
  font-family: 'Didot', 'Georgia', 'Times New Roman', Times, serif;
  font-size: 1.5rem;
  line-height: 1.7;
  color: #111827;
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: left;
}

.user-input-label {
  font-family: 'Georgia', serif;
  font-size: 1.6rem;
  line-height: 1.7;
  font-weight: 600;
  color: #1f2937;
}

.user-input-textarea {
  font-family: 'Didot', 'Times New Roman', serif;
  font-size: 1.4rem;
  line-height: 1.6;
  color: #111827;
}

.primary-button {
  background-color: #4a6fa5;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background-color: #3a5a8c;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-button {
  background-color: #6c757d;
  color: white;
}

.secondary-button:hover:not(:disabled) {
  background-color: #5a6268;
}

.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.ai-suggestion {
  background: rgba(255, 255, 255, 0.3);
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #4a6fa5;
}

.suggestion-content {
  font-size: 1.1rem;
  line-height: 1.6;
}

.suggestion-content p {
  margin-bottom: 0.75rem;
}

.suggestion-content p:last-child {
  margin-bottom: 0;
}

.greeting-text {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.greeting-text strong {
  color: #4a6fa5;
  font-weight: 600;
}
</style>
