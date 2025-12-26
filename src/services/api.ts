// src/services/api.ts
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// --- Type Definitions ---

export interface AccountInfo {
  user_id: string;
  story_count: number;
  story_limit: number;
  stories_remaining: number;
  subscription_type: string;
  can_create_story: boolean;
}

export interface SurveyStatusResponse {
  has_submitted: boolean;
  should_show_survey: boolean;
  completed_stories_count: number;
  last_submitted_at?: string | null;
}

export interface SurveySubmitRequest {
  liked_features: string;
  improvements: string;
  pricing_10_stories: string;
  pricing_monthly: string;
  pricing_annual: string;
  feature_parent_dashboard: string;
  feature_child_progress: string;
  feature_story_library: string;
  feature_julia_engine: string;
  feature_family_values: string;
}

// --- Internal Fetch Wrapper ---

/**
 * Enhanced fetch with timeout, retry, and better error handling
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const authStore = useAuthStore()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers as Record<string, string>
  }

  // Add JWT token if available
  if (authStore.authToken) {
    headers['Authorization'] = `Bearer ${authStore.authToken}`
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // JWT is in header, no cookies needed
      signal: controller.signal,
      mode: 'cors',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText
      }))
      const errorMessage = error.detail || `HTTP ${response.status}`
      console.error(`[API Error]: ${errorMessage}`)

      if (response.status === 401) {
        authStore.clearUserInfoAndToken()
      }

      throw new Error(errorMessage)
    }

    return await response.json()

  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      console.error('[API] Request timeout after 30 seconds')
      throw new Error('Request timeout - please check your connection')
    }

    console.error('[API] Request failed:', error)
    throw error
  }
}

export default {
  // --- Authentication ---
  async authenticateGhostUser(data: {
    ghost_user_id: string;
    name?: string;
    email?: string;
  }) {
    return apiFetch(`${API_URL}/api/auth/ghost-token`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async verifyToken() {
    return apiFetch(`${API_URL}/api/auth/test-my-token`, {
      method: 'GET'
    });
  },

  // --- Story Operations ---
  async startStory(data: { initial_prompt: string }) {
    return apiFetch(`${API_URL}/api/story/start`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async continueStory(data: { session_id: string; feedback: string }) {
    return apiFetch(`${API_URL}/api/story/continue`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async completeStory(data: { session_id: string }) {
    return apiFetch(`${API_URL}/api/story/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async saveStory(data: {
    story_name: string;
    story_content: string;
    session_id?: string | null
  }) {
    return apiFetch(`${API_URL}/api/story/save`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getUserStories() {
    return apiFetch(`${API_URL}/api/story/stories`, {
      method: 'GET'
    });
  },

  async getUsage() {
    return apiFetch(`${API_URL}/api/story/usage`, {
      method: 'GET'
    });
  },

  // --- PDF Generation ---
  async generateStoryPDF(data: { story_name: string; story_content: string }): Promise<Blob> {
    const authStore = useAuthStore()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authStore.authToken) {
      headers['Authorization'] = `Bearer ${authStore.authToken}`
    }

    const response = await fetch(`${API_URL}/api/story/pdf/story`, {
      method: 'POST',
      credentials: 'omit',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('PDF generation failed');
    }

    return response.blob();
  },

  // --- UI Configuration ---
  async getUiTexts() {
    return apiFetch(`${API_URL}/api/ui/texts`, {
      method: 'GET'
    });
  },

  // --- V3: Account & Survey Methods (NEW) ---

  async getAccountInfo(): Promise<AccountInfo> {
    return apiFetch(`${API_URL}/api/auth/account`, {
      method: 'GET'
    });
  },

  async getSurveyStatus(completed_stories: number): Promise<SurveyStatusResponse> {
    console.log(`[API] Checking survey status for ${completed_stories} completed stories`);
    return apiFetch(`${API_URL}/api/survey/status?completed_stories=${completed_stories}`, {
      method: 'GET'
    });
  },

  async submitSurvey(surveyData: SurveySubmitRequest) {
    console.log('[API] Submitting survey');
    return apiFetch(`${API_URL}/api/survey/submit`, {
      method: 'POST',
      body: JSON.stringify(surveyData)
    });
  },

  // --- Image Generation ---
  async generateImageFromStory(data: { story: string; prompt?: string }): Promise<Blob> {
    const authStore = useAuthStore()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authStore.authToken) {
      headers['Authorization'] = `Bearer ${authStore.authToken}`
    }

    console.log('[API] Generating image from story');

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

    try {
      const response = await fetch(`${API_URL}/api/image/generate-from-story`, {
        method: 'POST',
        credentials: 'omit',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: response.statusText
        }))
        throw new Error(error.detail || 'Image generation failed');
      }

      return await response.blob()

    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Image generation timeout - please try again')
      }
      console.error('[API] Image generation failed:', error)
      throw error
    }
  },

  // --- Health Check ---
  async healthCheck() {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    return response.json();
  },
};
