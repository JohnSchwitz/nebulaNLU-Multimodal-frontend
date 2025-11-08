import { defineStore } from 'pinia';
import api from '@/services/api';

const AUTH_TOKEN_KEY = 'app_auth_token';

interface AuthState {
  userId: string | null;
  userStatus: string | null;
  userName: string | null;
  userEmail: string | null;
  userTier: string | null;
  error: string | null;
  isLoading: boolean;
  authToken: string | null;
}

interface GhostUserData {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userStatus?: string | null;
  userTier?: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    userId: localStorage.getItem('ghostMemberUUID') || null,
    userStatus: localStorage.getItem('ghostMemberStatus') || null,
    userName: localStorage.getItem('ghostMemberName') || null,
    userEmail: localStorage.getItem('ghostMemberEmail') || null,
    userTier: localStorage.getItem('ghostMemberTier') || null,
    error: null,
    isLoading: false,
    authToken: localStorage.getItem(AUTH_TOKEN_KEY) || null,
  }),

  getters: {
    isAuthenticated(state: AuthState): boolean {
      return !!state.userId && !!state.authToken;
    },
    isPaidMember(state: AuthState): boolean {
      const paidStatuses = ['paid', 'active', 'trialing'];
      const paidTiers = ['paid-tier-slug', 'pro-tier-slug'];
      return (state.userStatus != null && paidStatuses.includes(state.userStatus.toLowerCase())) ||
             (state.userTier != null && paidTiers.includes(state.userTier.toLowerCase()));
    },
    userDisplayName(state: AuthState): string {
        return state.userName || state.userEmail || 'User';
    }
  },

  actions: {
    /**
     * Exchanges Ghost user ID for a backend authentication token.
     * This now also sends the user's name and email.
     */
    async exchangeGhostDataForToken(ghostUserId: string): Promise<string> {
      this.isLoading = true;
      this.error = null;
      console.log(`[AuthStore] AWAITING token exchange for Ghost User ID ${ghostUserId}.`);
      try {
          // --- THIS IS THE UPDATED API CALL ---
          const response = await api.authenticateGhostUser({
            ghost_user_id: ghostUserId,
            name: this.userName || undefined, // Pass name from store
            email: this.userEmail || undefined // Pass email from store
          });

          if (response && response.token) {
              console.log(`[AuthStore] Token received from backend.`);
              this.authToken = response.token;
              localStorage.setItem(AUTH_TOKEN_KEY, this.authToken);
              return response.token;
          } else {
            throw new Error("Backend did not return a valid token.");
          }
      } catch (e: any) {
           console.error("[AuthStore] Error during token exchange:", e);
           this.setError(e.message || "Failed to authenticate with backend.");
           this.clearUserInfoAndToken();
           throw e;
      } finally {
           this.isLoading = false;
      }
    },

    /**
     * Processes user data from Ghost and completes the entire token exchange.
     * This now returns a promise that resolves when the login is complete, or rejects if it fails.
     */
    async processGhostLogin(userData: GhostUserData): Promise<void> {
      console.log('[AuthStore] Starting full processGhostLogin flow...');
      if (!userData?.userId) {
        const err = "Invalid Ghost user data provided (missing userId).";
        this.setError(err);
        throw new Error(err);
      }

      // Clear any stale token to ensure a clean login state. This is a critical step.
      this.authToken = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
      console.log('[AuthStore] Cleared any stale auth token.');

      // Update state with Ghost data
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

      console.log('[AuthStore] Ghost user info set. Now awaiting token exchange...');

      // Await the token exchange to ensure it completes before this function resolves.
      await this.exchangeGhostDataForToken(this.userId);
      console.log('[AuthStore] processGhostLogin has successfully completed.');
    },

    setError(errorMessage: string | null): void {
      this.error = errorMessage;
      if (errorMessage) {
           this.isLoading = false;
      }
    },

    logout(): void {
      this.clearUserInfoAndToken();
      this.error = null;
      this.isLoading = false;
    },

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
