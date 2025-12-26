<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import api from '@/services/api';

const emit = defineEmits(['close', 'survey-submitted']);

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  completedStories: {
    type: Number,
    required: true,
  }
});

// FORM STATE
// Using a reactive object ensures v-model works correctly inside v-for loops
const formState = reactive({
  likedFeatures: '',
  improvements: '',
  pricing10Stories: '',
  pricingMonthly: '',
  pricingAnnual: '',
  featureParentDashboard: '',
  featureChildProgress: '',
  featureStoryLibrary: '',
  featureJuliaEngine: '',
  featureFamilyValues: ''
});

// SUBMISSION STATE
const isSubmitting = ref(false);
const submissionError = ref<string | null>(null);
const submissionSuccess = ref(false);

// VALIDATION
const isFormValid = computed(() => {
  // Returns true only if EVERY field in formState has a value
  return Object.values(formState).every(value => value.trim() !== '');
});

const handleSubmit = async () => {
  if (!isFormValid.value) {
    submissionError.value = 'Please fill out all fields to help us improve.';
    return;
  }

  isSubmitting.value = true;
  submissionError.value = null;

  try {
    // Send data to backend
    await api.submitSurvey({
      liked_features: formState.likedFeatures,
      improvements: formState.improvements,
      pricing_10_stories: formState.pricing10Stories,
      pricing_monthly: formState.pricingMonthly,
      pricing_annual: formState.pricingAnnual,
      feature_parent_dashboard: formState.featureParentDashboard,
      feature_child_progress: formState.featureChildProgress,
      feature_story_library: formState.featureStoryLibrary,
      feature_julia_engine: formState.featureJuliaEngine,
      feature_family_values: formState.featureFamilyValues,
    });

    // Show success state
    submissionSuccess.value = true;
    emit('survey-submitted');

    // Auto-close after 3 seconds
    setTimeout(() => {
      emit('close');
    }, 3000);

  } catch (error: any) {
    console.error('❌ Survey submission failed:', error);
    submissionError.value = error.message || 'An unexpected error occurred. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
};

const closeModal = () => {
  // Prevent closing while currently sending data
  if (!isSubmitting.value) {
    emit('close');
  }
};
</script>

<template>
  <transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <transition name="modal-slide">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="survey-title">

          <!-- =========================== -->
          <!-- VIEW 1: SUCCESS MESSAGE     -->
          <!-- =========================== -->
          <div v-if="submissionSuccess" class="p-8 md:p-12 text-center">
            <div class="success-animation">
              <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h2 class="text-3xl font-bold text-gray-800 mt-6">Thank You!</h2>
            <p class="text-gray-600 mt-2 text-lg">Your feedback helps us build the future of StoryTeller.</p>
          </div>

          <!-- =========================== -->
          <!-- VIEW 2: SURVEY FORM         -->
          <!-- =========================== -->
          <div v-else class="p-6 md:p-8">
            <div class="flex justify-between items-start mb-4">
              <h2 id="survey-title" class="text-2xl font-bold text-gray-800">We Value Your Opinion</h2>
              <button @click="closeModal" class="text-gray-500 hover:text-gray-800 text-2xl transition-colors">&times;</button>
            </div>

            <p class="mb-6 text-gray-600">
              Congratulations on completing {{ completedStories }} stories! As an early user, your feedback directly shapes our roadmap.
            </p>

            <form @submit.prevent="handleSubmit" class="space-y-8">

              <!-- SECTION 1: Open Ended -->
              <div class="space-y-4">
                <div>
                  <label for="liked_features" class="block text-sm font-bold text-gray-700 mb-1">1. What features did you enjoy the most?</label>
                  <textarea
                    id="liked_features"
                    v-model="formState.likedFeatures"
                    rows="2"
                    class="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. The AI suggestions..."
                    required
                  ></textarea>
                </div>
                <div>
                  <label for="improvements" class="block text-sm font-bold text-gray-700 mb-1">2. What could we improve?</label>
                  <textarea
                    id="improvements"
                    v-model="formState.improvements"
                    rows="2"
                    class="w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. I wish the stories were longer..."
                    required
                  ></textarea>
                </div>
              </div>

              <!-- SECTION 2: Pricing Preferences -->
              <fieldset class="p-5 border border-gray-200 rounded-lg bg-gray-50">
                <legend class="text-lg font-bold text-gray-800 px-2 bg-gray-50">3. Fair Pricing</legend>
                <p class="text-sm text-gray-500 mb-4 px-2">If we introduced premium features, what feels fair to you?</p>

                <div class="space-y-4">
                  <!-- 10 Pack -->
                  <div>
                    <h4 class="font-medium text-gray-700 text-sm mb-2">A. One-time Pack (10 Stories)</h4>
                    <div class="flex flex-wrap gap-4">
                      <label v-for="option in ['$10', '$20', '$30', 'won\'t_pay']" :key="option" class="flex items-center cursor-pointer bg-white px-3 py-1 rounded border border-gray-200 hover:border-blue-400">
                        <input type="radio" :value="option" v-model="formState.pricing10Stories" class="mr-2 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">{{ option.replace('_', ' ') }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Monthly -->
                  <div>
                    <h4 class="font-medium text-gray-700 text-sm mb-2">B. Monthly Subscription</h4>
                    <div class="flex flex-wrap gap-4">
                      <label v-for="option in ['$5', '$8', '$10', 'won\'t_pay']" :key="option" class="flex items-center cursor-pointer bg-white px-3 py-1 rounded border border-gray-200 hover:border-blue-400">
                        <input type="radio" :value="option" v-model="formState.pricingMonthly" class="mr-2 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">{{ option.replace('_', ' ') }}</span>
                      </label>
                    </div>
                  </div>

                  <!-- Annual -->
                  <div>
                    <h4 class="font-medium text-gray-700 text-sm mb-2">C. Annual Subscription</h4>
                    <div class="flex flex-wrap gap-4">
                      <label v-for="option in ['$60', '$80', '$100', 'won\'t_pay']" :key="option" class="flex items-center cursor-pointer bg-white px-3 py-1 rounded border border-gray-200 hover:border-blue-400">
                        <input type="radio" :value="option" v-model="formState.pricingAnnual" class="mr-2 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm">{{ option.replace('_', ' ') }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </fieldset>

              <!-- SECTION 3: Feature Priorities -->
              <fieldset class="p-5 border border-gray-200 rounded-lg">
                <legend class="text-lg font-bold text-gray-800 px-2 bg-white">4. Feature Roadmap</legend>
                <p class="text-sm text-gray-500 mb-4 px-2">How interested are you in these potential features?</p>

                <div class="space-y-0 divide-y divide-gray-100">
                  <!-- Loop for features -->
                  <div v-for="feature in [
                    { key: 'featureParentDashboard', label: 'Parent Dashboard' },
                    { key: 'featureChildProgress', label: 'Child Progress Tracking' },
                    { key: 'featureStoryLibrary', label: 'Public Story Library' },
                    { key: 'featureJuliaEngine', label: 'Advanced AI (Julia)' },
                    { key: 'featureFamilyValues', label: 'Family Values Integration' }
                  ]" :key="feature.key" class="grid grid-cols-1 md:grid-cols-2 gap-2 items-center py-3">

                    <span class="text-sm font-medium text-gray-700">{{ feature.label }}</span>

                    <div class="flex gap-2">
                      <label v-for="val in ['great', 'like', 'indifferent']" :key="val" class="flex-1 flex items-center justify-center cursor-pointer px-2 py-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200">
                        <!-- Dynamic Binding -->
                        <input
                          type="radio"
                          :name="feature.key"
                          :value="val"
                          v-model="(formState as any)[feature.key]"
                          class="mr-2 text-blue-600 focus:ring-blue-500"
                        >
                        <span class="text-xs uppercase font-bold text-gray-600">{{ val }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </fieldset>

              <!-- Error Message -->
              <div v-if="submissionError" class="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm" role="alert">
                {{ submissionError }}
              </div>

              <!-- Buttons -->
              <div class="flex justify-end pt-4 gap-3 border-t border-gray-100">
                <button type="button" @click="closeModal" class="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                  Skip for Now
                </button>
                <button
                  type="submit"
                  :disabled="!isFormValid || isSubmitting"
                  class="px-8 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm transform active:scale-95"
                >
                  {{ isSubmitting ? 'Sending...' : 'Submit Feedback' }}
                </button>
              </div>

            </form>
          </div>

        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
/* Modal Transitions */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-slide-enter-from, .modal-slide-leave-to {
  transform: translateY(20px) scale(0.98);
  opacity: 0;
}

/* Success Animation */
.success-animation { display: inline-block; margin-top: 20px; }
.checkmark {
  width: 80px; height: 80px; border-radius: 50%; display: block;
  stroke-width: 2; stroke: #22c55e; stroke-miterlimit: 10; margin: 0 auto;
  box-shadow: inset 0px 0px 0px #22c55e;
  animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
}
.checkmark__circle {
  stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10;
  stroke: #22c55e; fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.checkmark__check {
  transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}

@keyframes stroke { 100% { stroke-dashoffset: 0; } }
@keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
@keyframes fill { 100% { box-shadow: inset 0px 0px 0px 30px #22c55e; } }
</style>
