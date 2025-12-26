// src/stores/user.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, type AccountInfo } from '@/services/api';

export const useUserStore = defineStore('user', () => {
  // ... (Existing state: user, token, etc.)

  // New State
  const accountInfo = ref<AccountInfo | null>(null);
  const isLoadingAccount = ref(false);

  // Actions
  async function fetchAccountInfo() {
    isLoadingAccount.value = true;
    try {
      const info = await api.getAccountInfo();
      accountInfo.value = info;
    } catch (error) {
      console.error("Failed to fetch account info:", error);
    } finally {
      isLoadingAccount.value = false;
    }
  }

  /**
   * Helper to verify if user can generate
   */
  function canGenerateStory(): boolean {
    if (!accountInfo.value) return true; // optimistic default
    return accountInfo.value.can_create_story;
  }

  /**
   * Manually decrement locally to update UI immediately after generation
   */
  function decrementCredit() {
    if (accountInfo.value) {
      accountInfo.value.stories_remaining--;
      accountInfo.value.story_count++;
      if (accountInfo.value.stories_remaining <= 0) {
        accountInfo.value.can_create_story = false;
      }
    }
  }

  return {
    // ... existing exports
    accountInfo,
    isLoadingAccount,
    fetchAccountInfo,
    canGenerateStory,
    decrementCredit
  };
});
