// src/stores/auth.ts
import { defineStore } from 'pinia';
import api from '@/services/api'; // Import your api service for token exchange

// Define the key for storing the auth token in localStorage
const AUTH_TOKEN_KEY = 'app_auth_token';

// Define an interface for the state shape
interface AuthState {
  userId: string | null;       // Ghost Member UUID
  userStatus: string | null;   // Ghost Member Status
  userName: string | null;     // Ghost Member Name
  userEmail: string | null;    // Ghost Member Email
  userTier: string | null;     // Ghost Member Tier
  error: string | null;        // For authentication/processing errors
  isLoading: boolean;          // To indicate if an auth process is ongoing
  authToken: string | null;    // The JWT received from your backend
}

// Define an interface for the user data object passed from Ghost redirect
interface GhostUserData {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userStatus?: string | null;
  userTier?: string | null;
}

export const useAuthStore = defineStore('auth', {
  // == State ==
  state: (): AuthState => ({
    // Initialize from localStorage for persistence
    userId: localStorage.getItem('ghostMemberUUID') || null,
    userStatus: localStorage.getItem('ghostMemberStatus') || null,
    userName: localStorage.getItem('ghostMemberName') || null,
    userEmail: localStorage.getItem('ghostMemberEmail') || null,
    userTier: localStorage.getItem('ghostMemberTier') || null,
    error: null,
    isLoading: false,
    authToken: localStorage.getItem(AUTH_TOKEN_KEY) || null, // Load backend token
  }),

  // == Getters ==
  getters: {
    /**
     * Checks if the user is authenticated.
     * Now considers both userId (from Ghost) and authToken (from backend).
     * Both should ideally be present for full authentication.
     */
    isAuthenticated(state: AuthState): boolean {
      // For full functionality, both the Ghost user ID and a backend token should be present.
      // Adjust this logic based on your app's specific requirements.
      // If API calls are protected by the token, `!!state.authToken` is more critical.
      return !!state.userId && !!state.authToken;
    },

    /**
     * Checks if the user is a paid member based on Ghost status or tier.
     */
    isPaidMember(state: AuthState): boolean {
      const paidStatuses = ['paid', 'active', 'trialing']; // Customize with Ghost's actual paid statuses
      const paidTiers = ['paid-tier-slug', 'pro-tier-slug']; // Customize with your actual paid tier slugs
      return (state.userStatus != null && paidStatuses.includes(state.userStatus.toLowerCase())) ||
             (state.userTier != null && paidTiers.includes(state.userTier.toLowerCase()));
    },

    /**
     * Provides a display name for the user.
     */
    userDisplayName(state: AuthState): string {
        return state.userName || state.userEmail || 'User';
    }
  },

  // == Actions ==
  actions: {
    /**
     * Exchanges Ghost user ID for a backend authentication token.
     * @param {string} ghostUserId - The Ghost Member UUID.
     */
    // src/stores/auth.ts
// ...
    async exchangeGhostDataForToken(ghostUserId: string) {
      this.isLoading = true;
      this.error = null;
      console.log(`[AuthStore] Attempting to exchange Ghost User ID ${ghostUserId} for backend token.`);
      try {
          const response = await api.authenticateGhostUser({ ghost_user_id: ghostUserId });

          if (response && response.token) {
              console.log(`[AuthStore] Token received from backend: ${response.token.substring(0, 30)}...`); // Log prefix of new token
              this.authToken = response.token;
              localStorage.setItem(AUTH_TOKEN_KEY, this.authToken);
              console.log(`[AuthStore] NEW token stored in localStorage under key '${AUTH_TOKEN_KEY}'. Value: ${localStorage.getItem(AUTH_TOKEN_KEY)?.substring(0,30)}...`);
              console.log(`[AuthStore] Pinia state this.authToken updated to: ${this.authToken.substring(0,30)}...`);
          } else {
            throw new Error("Backend did not return a valid token.");
          }
      } catch (e: any) {
           console.error("[AuthStore] Error exchanging Ghost data for token:", e);
           this.setError(e.message || "Failed to authenticate with backend and get token.");
           // If token exchange fails, we should clear all user info, including Ghost details
           // as the user isn't fully authenticated with our system.
           this.clearUserInfoAndToken();
      } finally {
           this.isLoading = false; // Ensure isLoading is set to false
      }
  },

    /**
     * Processes user data received from Ghost redirect and then attempts token exchange.
     * @param {GhostUserData} userData - Object containing user details from Ghost.
     */
    processGhostLogin(userData: GhostUserData): void {
      // isLoading will be primarily managed by exchangeGhostDataForToken,
      // but we can set it true here to cover the initial Ghost data processing.
      this.isLoading = true;
      this.error = null;
      console.log('[AuthStore] processGhostLogin called with:', userData);

      try {
        if (!userData?.userId) {
          throw new Error("Invalid Ghost user data provided (missing userId).");
        }

        // Update state properties with Ghost data
        this.userId = userData.userId;
        this.userName = userData.userName || null;
        this.userEmail = userData.userEmail || null;
        this.userStatus = userData.userStatus || null;
        this.userTier = userData.userTier || null;

        // Persist Ghost info to localStorage
        localStorage.setItem('ghostMemberUUID', this.userId);
        if (this.userName) localStorage.setItem('ghostMemberName', this.userName); else localStorage.removeItem('ghostMemberName');
        if (this.userEmail) localStorage.setItem('ghostMemberEmail', this.userEmail); else localStorage.removeItem('ghostMemberEmail');
        if (this.userStatus) localStorage.setItem('ghostMemberStatus', this.userStatus); else localStorage.removeItem('ghostMemberStatus');
        if (this.userTier) localStorage.setItem('ghostMemberTier', this.userTier); else localStorage.removeItem('ghostMemberTier');

        console.log('[AuthStore] Ghost user info set. Now attempting token exchange...');

        // Immediately call the token exchange action.
        // This will handle its own isLoading and error states.
        this.exchangeGhostDataForToken(this.userId);

      } catch (e: any) {
        console.error("[AuthStore] Error in processGhostLogin (before token exchange):", e);
        this.setError(e.message || "Failed to process Ghost user information.");
        this.clearUserInfoAndToken(); // Clear everything if initial processing fails
        this.isLoading = false; // Ensure loading stops if error occurs before token exchange call
      }
      // Note: The final isLoading=false is handled by exchangeGhostDataForToken
    },

    /**
     * Sets the error state.
     * @param {string | null} errorMessage - The error message or null to clear.
     */
    setError(errorMessage: string | null): void {
      console.log("[AuthStore] setError called with:", errorMessage);
      this.error = errorMessage;
      if (errorMessage) {
           this.isLoading = false; // If an error is set, stop loading
      }
    },

    /**
     * Clears all authentication state (Ghost user info and backend token).
     */
    logout(): void {
      console.log('[AuthStore] logout action called.');
      this.clearUserInfoAndToken(); // Use the helper
      this.error = null;
      this.isLoading = false;
      console.log('[AuthStore] User info and token cleared (logout).');
      // Optional: Handle redirect after logout if needed (e.g., in the component calling logout)
    },

    /**
     * Clears just the error message state.
     */
    clearAuthError(): void {
       this.error = null;
    },

    /**
     * Helper action to clear all user-related information from state and localStorage.
     * This is used on logout and critical errors during authentication.
     */
    clearUserInfoAndToken() {
         this.userId = null;
         this.userStatus = null;
         this.userName = null;
         this.userEmail = null;
         this.userTier = null;
         this.authToken = null;

         localStorage.removeItem('ghostMemberUUID');
         localStorage.removeItem('ghostMemberName');
         localStorage.removeItem('ghostMemberEmail');
         localStorage.removeItem('ghostMemberStatus');
         localStorage.removeItem('ghostMemberTier');
         localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },
});
