<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import api from '@/services/api';

// COMPONENTS
import SurveyModal from '@/components/SurveyModal.vue';
import SurveyBanner from '@/components/SurveyBanner.vue';

// PINIA STORE
const authStore = useAuthStore();
const {
  isAuthenticated,
  userId,
  userName: authUserName,
  isLoading: authIsLoading,
  error: authError
} = storeToRefs(authStore);

// STORY STATE
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

// V3: ACCOUNT & SURVEY STATE
const accountInfo = ref<{ story_count: number; story_limit: number; stories_remaining: number; can_create_story: boolean; subscription_type: string; } | null>(null);
const accountLoading = ref(false);
const accountError = ref<string | null>(null);

const showSurvey = ref(false);
const showBanner = ref(false); // The "Snake" banner
const completedStoriesForSurvey = ref<number>(0);

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

// --- API ACTIONS ---

// FETCH ACCOUNT INFO (Restored)
const fetchAccountInfo = async () => {
  if (!isAuthenticated.value) return;
  console.log("CreateStory: Fetching account info...");
  accountLoading.value = true;
  accountError.value = null;
  try {
    const data = await api.getAccountInfo();
    accountInfo.value = data;
    console.log("CreateStory: Account info loaded:", data);
  } catch (error: any) {
    console.error("CreateStory: Failed to load account info", error);
    accountError.value = error.message || 'Could not load your story credits.';
  } finally {
    accountLoading.value = false;
  }
};

// 1. GENERATE
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

      sessionId.value = response.session_id;

      if (response.next_prompt_for_user) {
        storyContent.value = response.story;
        aiSuggestionForNextTurn.value = response.next_prompt_for_user;
      } else {
        const { story, prompt } = cleanStory(response.story);
        storyContent.value = story;
        aiSuggestionForNextTurn.value = prompt;
      }

      // Update local credits immediately (optimistic UI)
      if (accountInfo.value) {
        accountInfo.value.stories_remaining--;
        accountInfo.value.story_count++;
      }
    }

    currentIteration.value = response.iteration || currentIteration.value + 1;
    storyTellerInput.value = '';
    console.log('✅ Story generated');

  } catch (error: any) {
    console.error('❌ Error:', error);
    generationError.value = error.message || 'Story generation failed';
  } finally {
    loading.value = false;
  }
};

// 2. COMPLETE
const completeStory = async () => {
  if (!sessionId.value || !isAuthenticated.value) return;

  loading.value = true;
  isCompletingStory.value = true;
  generationError.value = null;

  try {
    console.log('🏁 Completing story');
    const response = await api.completeStory({ session_id: sessionId.value });

    let finalStory = response.full_story || storyContent.value;
    // Clean up NEXT_PROMPT artifacts
    const storyParts = finalStory.split(/NEXT_PROMPT:[^\n]*(\n\n|$)/gi);
    finalStory = storyParts.join('\n\n').trim();

    storyContent.value = finalStory;
    isCompleted.value = true;
    currentIteration.value = response.iteration;

    // Refresh account info to sync real server count
    await fetchAccountInfo();

    // V3 SURVEY CHECK
    try {
      if (accountInfo.value) {
        const status = await api.getSurveyStatus(accountInfo.value.story_count);
        if (status.should_show_survey) {
          completedStoriesForSurvey.value = status.completed_stories_count;
          showSurvey.value = true; // Trigger Modal
          showBanner.value = false;
        }
      }
    } catch (e) { console.error("⚠️ Failed to check survey status:", e); }

  } catch (error: any) {
    console.error('❌ Error:', error);
    generationError.value = error.message || 'Failed to complete story';
  } finally {
    loading.value = false;
    isCompletingStory.value = false;
  }
};

// 3. SAVE
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
    uploadError.value = error.message || 'Save failed';
  } finally {
    uploadLoading.value = false;
  }
};

// 4. PDF
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
    uploadError.value = `PDF failed: ${error.message}`;
  }
};

// --- SURVEY HANDLERS ---

const handleSurveyClose = () => {
  showSurvey.value = false;
  // If they close without submitting, show the sticky banner
  showBanner.value = true;
};

const handleSurveySubmitted = () => {
  showSurvey.value = false;
  showBanner.value = false; // Permanently hide banner for this session
  fetchAccountInfo(); // Refresh account to maybe update flags?
};

const openSurveyFromBanner = () => {
  showBanner.value = false;
  showSurvey.value = true;
};

// --- LIFECYCLE ---

onMounted(async () => {
  if (isAuthenticated.value) {
    // Force fetch on mount
    await fetchAccountInfo();
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
    } catch (error) {
      initialGuidanceFromAPI.value = "Welcome {{name}}! Let's start an adventure.";
    }
  }
});

watch(isAuthenticated, async (newAuth, oldAuth) => {
  if (newAuth === true && oldAuth === false) {
    // Fetch on login
    await fetchAccountInfo();
    try {
      const uiTexts = await api.getUiTexts();
      initialGuidanceFromAPI.value = uiTexts.initialStoryGuidance;
    } catch (error) {
      initialGuidanceFromAPI.value = "Welcome {{name}}! Let's start an adventure.";
    }
  }
});
</script>

<template>
  <div class="create-story-page max-w-4xl mx-auto p-4 md:p-6 font-didot mb-16">

    <!-- SURVEY COMPONENTS -->
    <SurveyModal
      :show="showSurvey"
      :completed-stories="completedStoriesForSurvey"
      @close="handleSurveyClose"
      @survey-submitted="handleSurveySubmitted"
    />

    <SurveyBanner
      :show="showBanner"
      @click="openSurveyFromBanner"
    />

    <!-- AUTH LOADING -->
    <div v-if="authIsLoading" class="text-center py-4 text-gray-600">
      Authenticating user...
    </div>

    <!-- MAIN CONTENT -->
    <div v-else>

      <!-- AUTH ERROR -->
      <div v-if="authError" class="my-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong class="font-bold">Authentication Error:</strong> {{ authError }}. Please try logging in again.
      </div>
      <div v-else-if="!isAuthenticated" class="my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
        Please log in via Ghost to create and save stories.
      </div>

      <div v-if="isAuthenticated" class="story-creation-area mt-6">

        <!-- ACCOUNT / LIMITS DISPLAY (Restored) -->
        <div v-if="accountLoading" class="text-center text-gray-500 text-sm mb-2">Loading credits...</div>

        <div v-if="accountInfo && !accountInfo.can_create_story" class="my-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-sm">
          <p class="font-bold text-lg">Story Limit Reached</p>
          <p>You have used all {{ accountInfo.story_limit }} of your available stories. Please upgrade to continue.</p>
        </div>

        <div v-else-if="accountInfo" class="flex justify-end mb-2">
          <span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
            Stories Remaining: <strong class="ml-1">{{ accountInfo.stories_remaining }} / {{ accountInfo.story_limit }}</strong>
          </span>
        </div>

        <!-- INSTRUCTION BOX (Orange) -->
        <div class="instruction-box my-4 p-5 rounded-lg shadow-md border border-orange-200" style="background-color: #FFE086; color: #1a1a1a;">
          <p class="instruction-box-greeting mb-2 font-bold text-lg">
            Hello {{ authUserName || 'Storyteller' }}!
            <span v-if="!sessionId && currentIteration === 0" class="font-normal text-base block sm:inline opacity-90">
              - Let's Begin!
            </span>
            <span v-else-if="sessionId && !isCompleted" class="font-normal text-base block sm:inline opacity-90">
              - Turn {{ currentIteration + 1 }}
            </span>
          </p>

          <div v-if="!sessionId && currentIteration === 0" class="instruction-box-text">
            <p v-if="initialGuidanceFromAPI" v-html="processedGuidance.replace(/\n/g, '<br>')"></p>
            <p v-else>Enter your initial story idea to start our adventure!</p>
          </div>

          <div v-else-if="!isCompleted" class="instruction-box-text">
            <div v-if="aiSuggestionForNextTurn" class="bg-white/40 p-3 rounded mt-2 border-l-4 border-blue-500">
              <p class="font-bold text-sm text-blue-900 mb-1">💡 AI Suggestion:</p>
              <div v-html="formatSuggestion(aiSuggestionForNextTurn)"></div>
            </div>
            <p v-else class="mt-2">What happens next? Add to the story or suggest a new direction!</p>
          </div>

          <div v-else class="instruction-box-text font-medium text-green-900">
            <p>Your story is complete! See below to save, download, or illustrate it.</p>
          </div>
        </div>

        <!-- LOADING SPINNER -->
        <div v-if="loading || uploadLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div class="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div class="spinner mb-4"></div>
            <p class="text-gray-800 font-medium text-lg">
              {{ loading && !isCompletingStory ? 'Writing Story...' :
                 loading && isCompletingStory ? 'Writing Conclusion...' :
                 uploadLoading ? 'Saving to Cloud...' : 'Processing...' }}
            </p>
          </div>
        </div>

        <!-- GENERATION ERROR -->
        <div v-if="generationError" class="my-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm">
          <h3 class="font-bold">Generation Error</h3>
          <p>{{ generationError }}</p>
          <p class="text-sm mt-1 opacity-75">Please try rephrasing your request.</p>
        </div>

        <!-- HEADER -->
        <h1 class="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-800 tracking-tight">
          {{ sessionId ? 'Continue Your Story' : 'Start a New Story' }}
        </h1>

        <!-- STORY CONTENT DISPLAY -->
        <div v-if="storyContent" class="bg-white p-6 md:p-8 rounded-lg shadow-lg mb-6 border border-gray-100 min-h-[200px]">
          <h3 class="text-lg font-semibold mb-4 text-gray-400 border-b pb-2 uppercase tracking-wide text-xs">Story Progress</h3>
          <div class="story-content-text whitespace-pre-wrap leading-relaxed text-gray-800 text-lg">{{ storyContent }}</div>

          <div v-if="isCompleted" class="mt-8 p-4 bg-green-50 text-green-800 rounded border border-green-200 text-center font-medium">
            ✨ The End
          </div>
        </div>

        <!-- USER INPUT (If active) -->
        <div v-if="!isCompleted" class="mb-8">
          <label for="story-teller-input" class="block text-xl font-medium text-gray-700 mb-3 font-georgia">
            {{ sessionId ?
               (aiSuggestionForNextTurn ? 'How should the story continue?' : 'What happens next?') :
               'Once upon a time...' }}
          </label>
          <textarea
            id="story-teller-input"
            v-model="storyTellerInput"
            :placeholder="aiSuggestionForNextTurn || currentPlaceholder"
            rows="4"
            class="w-full border border-gray-300 rounded-lg p-4 text-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-serif"
            :class="{ 'border-red-300 bg-red-50': storyTellerInput.length > 0 && !isPromptValid }"
          ></textarea>
          <div class="flex justify-between mt-2">
            <p v-if="storyTellerInput.length > 0 && !isPromptValid" class="text-red-600 text-sm">
              Keep typing... ({{ storyTellerInput.length }}/{{ MIN_PROMPT_LENGTH }} chars)
            </p>
            <p v-else class="text-gray-400 text-xs ml-auto">
              {{ storyTellerInput.length }} chars
            </p>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div v-if="!isCompleted" class="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <button
            @click="generateStory"
            :disabled="!isPromptValid || loading || !isAuthenticated || (accountInfo && !accountInfo.can_create_story)"
            class="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg shadow-md transition-all transform hover:-translate-y-0.5"
          >
            {{ (loading && !isCompletingStory) ? 'Writing...' : (sessionId ? 'Continue Story' : 'Start Adventure') }}
          </button>

          <button
            v-if="sessionId && !isCompleted"
            @click="completeStory"
            :disabled="loading || !isAuthenticated"
            class="px-8 py-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg shadow-md transition-all"
          >
            {{ (loading && isCompletingStory) ? 'Finishing...' : 'Finish Story' }}
          </button>
        </div>

        <!-- COMPLETION AREA (Save, PDF, Image) -->
        <div v-if="isCompleted" class="animate-fade-in space-y-8">

          <!-- 1. SAVE & PDF -->
          <div class="bg-gray-50 p-6 md:p-8 rounded-xl border border-gray-200">
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Save Your Masterpiece</h3>

            <div class="mb-6">
              <label for="storyNameInput" class="block text-sm font-medium text-gray-700 mb-2">Story Title</label>
              <input
                type="text"
                id="storyNameInput"
                v-model="storyName"
                @blur="storyNameTouched = true"
                class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., The Magical Forest Adventure"
              />
              <p v-if="showNameError" class="text-red-600 text-sm mt-1">Please give your story a title.</p>
            </div>

            <!-- MESSAGES -->
            <div v-if="uploadError" class="mb-4 bg-red-100 text-red-700 p-3 rounded">Error: {{ uploadError }}</div>
            <div v-if="uploadSuccessMessage" class="mb-4 bg-green-100 text-green-700 p-3 rounded">✅ {{ uploadSuccessMessage }}</div>

            <div class="flex flex-wrap gap-4">
              <button
                @click="uploadToDatabase"
                :disabled="!isStoryNameValid || uploadLoading || !isAuthenticated"
                class="flex-1 min-w-[200px] px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow transition-colors"
              >
                {{ uploadLoading ? 'Saving...' : 'Save to Library' }}
              </button>

              <button
                @click="downloadAsPDF"
                :disabled="!isStoryNameValid"
                class="flex-1 min-w-[200px] px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-sm transition-colors"
              >
                Download PDF
              </button>
            </div>
            <div class="mt-4 text-center">
              <router-link to="/download" class="text-blue-600 hover:underline text-sm">View all my stories</router-link>
            </div>
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

.font-didot { font-family: 'Didot', 'Bodoni MT', serif; }
.font-georgia { font-family: 'Georgia', serif; }

.instruction-box { font-family: 'Georgia', serif; line-height: 1.5; }

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
