// src/stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  // State: Data managed by the store
  state: () => ({
    userId: null,          // Holds the Ghost Member UUID
    userStatus: null,      // Holds 'free', 'paid', etc.
    userName: null,        // Optional: store name
    userEmail: null,       // Optional: store email
    error: null,           // Any auth/initialization error
    isLoading: false,      // Loading state for initial user info fetch
  }),

  // Getters: Computed properties based on state
  getters: {
    isAuthenticated: (state) => !!state.userId, // Simple check if user ID exists
    // Example: Check for paid status (adjust based on actual status values)
    isPaidMember: (state) => state.userStatus === 'paid' || state.userStatus === 'comped' // Add other paid statuses if needed
  },

  // Actions: Methods to modify the state
  actions: {
    // Action called by CreateStory.vue when it reads URL params
    setUserInfoFromUrl(searchParamsString) {
      this.isLoading = true;
      this.error = null;
      console.log('[AuthStore] Setting user info from URL params...');
      try {
        const params = new URLSearchParams(searchParamsString);
        const ghostUUID = params.get('ghost_member_uuid');
        const ghostStatus = params.get('ghost_member_status');
        const ghostName = params.get('ghost_member_name');
        const ghostEmail = params.get('ghost_member_email');

        if (ghostUUID) {
          this.userId = ghostUUID;
          this.userStatus = ghostStatus;
          this.userName = ghostName;
          this.userEmail = ghostEmail;
          console.log('[AuthStore] User info set:', { userId: this.userId, status: this.userStatus, name: this.userName });

          // Optional: Clean the URL after reading params (might affect refresh behaviour)
          // window.history.replaceState({}, document.title, window.location.pathname);

        } else {
          console.warn('[AuthStore] No Ghost Member UUID found in URL.');
          this.error = "Could not identify user from Ghost redirect.";
          this.clearUserInfo(); // Ensure state is clear if no ID found
        }
      } catch (e) {
        console.error("[AuthStore] Error processing URL parameters:", e);
        this.error = "Error reading user information from URL.";
        this.clearUserInfo();
      } finally {
        this.isLoading = false;
      }
    },

    // Action to clear user info (e.g., on logout, error)
    clearUserInfo() {
      this.userId = null;
      this.userStatus = null;
      this.userName = null;
      this.userEmail = null;
      // Keep error state if needed, or clear it:
      // this.error = null;
      console.log('[AuthStore] User info cleared.');
    },

     // Action to clear only the error message
     clearAuthError() {
       this.error = null;
     }
  },
});
