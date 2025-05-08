// src/stores/auth.ts
import { defineStore } from 'pinia';
import type { Ref } from 'vue'; // Optional: for explicit Ref types if needed elsewhere

// Define an interface for the state shape (good practice with TypeScript)
interface AuthState {
  userId: string | null;
  userStatus: string | null;
  userName: string | null;
  userEmail: string | null;
  error: string | null;
  isLoading: boolean;
  // Add other state properties if you have them
  // authToken: string | null; // Example if storing a token
}

// Define an interface for the user data object passed from components
interface GhostUserData {
    userId: string;
    userName?: string | null;
    userEmail?: string | null;
    userStatus?: string | null;
    userTier?: string | null; // Added tier based on previous examples
}

export const useAuthStore = defineStore('auth', {
  // == State ==
  // Use a function for the state and apply the interface type
  state: (): AuthState => ({
    // Try to initialize from localStorage for basic persistence on refresh
    userId: localStorage.getItem('ghostMemberUUID') || null,
    userStatus: localStorage.getItem('ghostMemberStatus') || null,
    userName: localStorage.getItem('ghostMemberName') || null,
    userEmail: localStorage.getItem('ghostMemberEmail') || null,
    userTier: localStorage.getItem('ghostMemberTier') || null, // Added tier persistence
    error: null,
    isLoading: false, // Start as false, set true only during async actions if any
    // authToken: localStorage.getItem('YOUR_AUTH_TOKEN_KEY') || null, // Example token persistence
  }),

  // == Getters ==
  // Add return types for getters
  getters: {
    isAuthenticated(state: AuthState): boolean {
      return !!state.userId; // True if userId is truthy (not null/empty)
    },
    isPaidMember(state: AuthState): boolean {
      // Example: Check for specific paid tier slugs or status
      const paidStatuses = ['paid', 'active', 'trialing']; // Add Ghost's actual paid statuses
      const paidTiers = ['paid-tier-slug', 'pro-tier-slug']; // Add your actual paid tier slugs
      return (state.userStatus != null && paidStatuses.includes(state.userStatus.toLowerCase())) ||
             (state.userTier != null && paidTiers.includes(state.userTier.toLowerCase()));
    },
    // Getter to provide display name, falling back to email or 'User'
    userDisplayName(state: AuthState): string {
        return state.userName || state.userEmail || 'User';
    }
  },

  // == Actions ==
  // Add type annotations for parameters and potentially return types
  actions: {

    /**
     * Processes user data received from Ghost redirect (URL Params) and updates the store.
     * This replaces setUserInfoFromUrl and matches the name used in CreateStory.vue.
     * @param {GhostUserData} userData - Object containing user details.
     */
    processGhostLogin(userData: GhostUserData): void {
      this.isLoading = true; // Indicate processing
      this.error = null;     // Clear previous errors
      console.log('[AuthStore] processGhostLogin called with:', userData);
      try {
        if (!userData?.userId) { // Use optional chaining and check userId
          throw new Error("Invalid user data provided (missing userId).");
        }

        // Update state properties
        this.userId = userData.userId;
        this.userName = userData.userName || null; // Use null if undefined/empty
        this.userEmail = userData.userEmail || null;
        this.userStatus = userData.userStatus || null;
        this.userTier = userData.userTier || null; // Added tier

        // Persist essential info to localStorage (optional, choose what to persist)
        localStorage.setItem('ghostMemberUUID', this.userId);
        if (this.userName) localStorage.setItem('ghostMemberName', this.userName); else localStorage.removeItem('ghostMemberName');
        if (this.userEmail) localStorage.setItem('ghostMemberEmail', this.userEmail); else localStorage.removeItem('ghostMemberEmail');
        if (this.userStatus) localStorage.setItem('ghostMemberStatus', this.userStatus); else localStorage.removeItem('ghostMemberStatus');
        if (this.userTier) localStorage.setItem('ghostMemberTier', this.userTier); else localStorage.removeItem('ghostMemberTier');

        // No need to set isAuthenticated manually, the getter handles it based on userId

        console.log('[AuthStore] User info set via processGhostLogin:', {
             userId: this.userId, status: this.userStatus, name: this.userName, tier: this.userTier
        });

      } catch (e: any) { // Catch error and type it as any
        console.error("[AuthStore] Error in processGhostLogin:", e);
        this.setError(e.message || "Failed to process user login information.");
        // Optionally clear partial info if processing fails
        this.clearUserInfo();
      } finally {
        this.isLoading = false; // Finish loading state
      }
    },

    /**
     * Sets the error state.
     * @param {string | null} errorMessage - The error message or null to clear.
     */
    setError(errorMessage: string | null): void {
      console.log("[AuthStore] setError called with:", errorMessage);
      this.error = errorMessage;
      // If setting an error, maybe set loading to false?
      if (errorMessage) {
           this.isLoading = false;
      }
    },

    /**
     * Clears authentication state (e.g., for logout).
     */
    logout(): void {
      console.log('[AuthStore] logout action called.');
      this.userId = null;
      this.userStatus = null;
      this.userName = null;
      this.userEmail = null;
      this.userTier = null; // Clear tier
      this.error = null;
      this.isLoading = false; // Ensure loading is false on logout
      // this.authToken = null; // Clear token if storing it

      // Clear persisted data
      localStorage.removeItem('ghostMemberUUID');
      localStorage.removeItem('ghostMemberName');
      localStorage.removeItem('ghostMemberEmail');
      localStorage.removeItem('ghostMemberStatus');
      localStorage.removeItem('ghostMemberTier');
      // localStorage.removeItem('YOUR_AUTH_TOKEN_KEY'); // Clear token too

      console.log('[AuthStore] User info cleared (logout).');
      // Optional: Redirect to login page using Vue Router instance
      // Need to inject router or handle navigation in component after calling logout
      // Example: router.push('/login');
    },

    // Keep your existing action to clear only the error
    /**
     * Clears just the error message state.
     */
    clearAuthError(): void {
       this.error = null;
     }

     // Removed setUserInfoFromUrl as processGhostLogin replaces it
  },
});

// Optional: Add HMR support if using Vite
// if (import.meta.hot) {
//   import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
// }
