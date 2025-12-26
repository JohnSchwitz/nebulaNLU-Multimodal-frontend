// src/stores/survey.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, type SurveySubmitRequest } from '@/services/api';

export const useSurveyStore = defineStore('survey', () => {
  // State
  const showBanner = ref(false); // The marquee at the bottom
  const showModal = ref(false);  // The actual form
  const isSubmitting = ref(false);
  const hasCheckedThisSession = ref(false);

  // Actions

  /**
   * Checks backend to see if the user qualifies for a survey.
   * Call this after a story is completed or on dashboard load.
   */
  async function checkSurveyEligibility(currentStoryCount: number) {
    try {
      const status = await api.getSurveyStatus(currentStoryCount);

      if (status.should_show_survey) {
        showBanner.value = true;
      } else {
        showBanner.value = false;
      }
    } catch (error) {
      console.error("Failed to check survey status:", error);
      // Fail silently, don't block the user
      showBanner.value = false;
    }
  }

  /**
   * Opens the survey form
   */
  function openSurvey() {
    showModal.value = true;
    showBanner.value = false; // Hide banner once opened
  }

  /**
   * Closes the survey form (User skipped)
   */
  function closeSurvey() {
    showModal.value = false;
    // Optional: showBanner.value = true? Or let it stay hidden until next refresh?
    // For now, keep it hidden to avoid annoyance.
  }

  /**
   * Submits the form and updates local state
   */
  async function submitSurvey(data: SurveySubmitRequest) {
    isSubmitting.value = true;
    try {
      await api.submitSurvey(data);
      showModal.value = false;
      showBanner.value = false; // Permanently hide for this cycle
      return true;
    } catch (error: any) {
      console.error("Survey submission failed:", error);
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    showBanner,
    showModal,
    isSubmitting,
    checkSurveyEligibility,
    openSurvey,
    closeSurvey,
    submitSurvey
  };
});
