// src/services/api.ts
import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig } from 'axios'; // Correct way to import types

// --- Configuration ---
// It should point to your *deployed* backend API URL.
// For local development, it falls back to http://127.0.0.1:5000.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AUTH_TOKEN_STORAGE_KEY = 'app_auth_token'; // Consistent key for storing the backend token

console.log(`API Service configured for URL: ${API_URL}`);
if (import.meta.env.PROD && API_URL === 'http://localhost:5000') {
    console.warn(
        'WARNING: Application is in PRODUCTION mode but API_URL is set to localhost. ' +
        'Ensure VITE_API_URL is correctly set in your deployment environment.'
    );
}

// --- Axios Client Setup ---
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials should generally be false unless explicitly dealing with
  // CORS that requires cookies and your server is configured for it.
  // For token-based auth (Bearer token), it's typically false.
  withCredentials: false,
});

// --- Interceptors ---
// Request Interceptor: Adds the Authorization token to requests
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig): AxiosRequestConfig => { // Explicitly type config
    const tokenFromStorage = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    console.log(`[API Interceptor] Attempting to get token from localStorage with key '${AUTH_TOKEN_STORAGE_KEY}'. Found: ${tokenFromStorage ? tokenFromStorage.substring(0,30)+'...' : 'null'}`);

    if (tokenFromStorage) {
      if (!config.headers) {
          config.headers = {};
      }
      config.headers.Authorization = `Bearer ${tokenFromStorage}`;
      console.log(`[API Interceptor] Added Authorization header for URL: ${config.url}`);
    } else {
      console.warn(`[API Interceptor] No token found in localStorage for URL: ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('Axios request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles global error logging
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`API Error: ${error.response.status} ${error.response.statusText}`, error.response.data);
    } else if (error.request) {
      console.error('API Network Error:', error.request);
    } else {
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// --- TypeScript Interfaces for Payloads and Responses ---
interface UiTextsResponse {
    placeholderPrompts: string[];
    initialStoryGuidance: string;
}

interface StorySegmentResponse {
  session_id: string;
  story: string;
  iteration?: number;
  complete?: boolean;
  full_story_draft?: string;
}

interface FinalStoryResponse {
  session_id: string;
  story: string;
  iteration?: number;
  complete?: boolean;
}

interface SaveResponse {
  story_id?: string;
  narrative_id?: string;
  message: string;
}

interface StartStoryPayload {
  initial_prompt: string;
  user_id: string;
}

interface ContinueStoryPayload {
  session_id: string;
  feedback: string;
  user_id: string;
}

interface CompleteStoryPayload {
  session_id: string;
  user_id: string;
}

interface SaveStoryPayload {
  story_name: string;
  story_content: string;
  sessionId?: string | null; // sessionId is optional for saving if not part of a session
  user_id: string;
}

interface PdfStoryPayload {
  story_name: string;
  story_content: string;
  user_id: string;
}

// For the Ghost Token Exchange
interface GhostAuthPayload {
  ghost_user_id: string;
}

interface AuthTokenResponse {
  token: string;
  // Potentially other user details if your backend returns them
}

// --- API Method Definitions ---
const api = {
  // == Ghost User Authentication with Backend ==
  async authenticateGhostUser(data: GhostAuthPayload): Promise<AuthTokenResponse> {
    try {
      const response: AxiosResponse<AuthTokenResponse> = await apiClient.post(`/api/auth/ghost-token`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Backend authentication with Ghost ID failed');
    }
  },

  // == Story Methods (Session-Based) ==
  async getUiTexts(): Promise<UiTextsResponse> {
    try {
        // Ensure the backend route is '/api/ui/texts' as defined in main.py
        const response: AxiosResponse<UiTextsResponse> = await apiClient.get('/api/ui/texts');
        // Provide a more robust default if response.data is unexpectedly shaped
        return response.data || {
            placeholderPrompts: ["What happens next in your amazing story?"],
            initialStoryGuidance: "Let's begin our adventure! What's your first idea?"
        };
    } catch (error: any) {
        console.error('Error fetching UI texts from backend:', error);
        // Return a fallback object that matches the UiTextsResponse structure
        return {
            placeholderPrompts: ["Tell me what happens next...", "What if...?"],
            initialStoryGuidance: "Welcome! Please enter your story idea below to begin this epic journey."
        };
    }
  },

  async getPlaceholderPrompts(): Promise<string[]> {
    try {
        const response: AxiosResponse<string[]> = await apiClient.get('/api/ui/placeholders');
        return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        console.error('Error fetching placeholder prompts:', error);
        return ["What amazing adventure awaits?", "Tell me more..."]; // Fallback
    }
  },

  async startStory(data: StartStoryPayload): Promise<StorySegmentResponse> {
    try {
      const response: AxiosResponse<StorySegmentResponse> = await apiClient.post('/api/story/start', data);
      return response.data;
    } catch (error: any) {
      console.error("API Error in startStory:", error);
      throw new Error(error.response?.data?.error || 'Failed to start story');
    }
  },

  async continueStory(data: ContinueStoryPayload): Promise<StorySegmentResponse> {
    try {
      const response: AxiosResponse<StorySegmentResponse> = await apiClient.post('/api/story/continue', data);
      return response.data;
    } catch (error: any) {
      console.error("API Error in continueStory:", error);
      throw new Error(error.response?.data?.error || 'Failed to continue story');
    }
  },

  async completeStory(data: CompleteStoryPayload): Promise<FinalStoryResponse> {
    try {
      const response: AxiosResponse<FinalStoryResponse> = await apiClient.post('/api/story/complete', data);
      return response.data;
    } catch (error: any) {
      console.error("API Error in completeStory:", error);
      throw new Error(error.response?.data?.error || 'Failed to complete story');
    }
  },

  // == Story Persistence ==
  async saveStory(data: SaveStoryPayload): Promise<SaveResponse> {
    try {
      const payloadToBackend = {
        story_name: data.story_name,
        story_content: data.story_content,
        user_id: data.user_id,
        ...(data.sessionId && { session_id: data.sessionId })
      };

      const response: AxiosResponse<SaveResponse> = await apiClient.post(`/api/story/save`, payloadToBackend);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to save story');
    }
  },

  async getUserStories(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/user/stories?user_id=${encodeURIComponent(userId)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('Error fetching user stories:', error);
      return [];
    }
  },

  // == PDF Methods ==
  async generateStoryPDF(data: PdfStoryPayload): Promise<Blob> {
    try {
      const response = await apiClient.post('/api/pdf/story', data, { responseType: 'blob' });
      if (!(response.data instanceof Blob)) {
        throw new Error("Invalid PDF response data from server.");
      }
      return response.data;
    } catch (error: any) {
      const errMessage = "Failed to download story PDF.";
      if (error.response && error.response.data instanceof Blob) {
        try {
          const errJson = JSON.parse(await error.response.data.text());
          throw new Error(errJson.error || errMessage);
        } catch (_) { /* ignore parsing error of blob */ }
      }
      throw new Error(error.response?.data?.error || error.message || errMessage);
    }
  },

  // == Admin Settings ==
  async getAdminSettings(userId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/admin/settings?user_id=${encodeURIComponent(userId)}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch admin settings');
    }
  },

  async saveAdminSettings(settings: any & { user_id: string }): Promise<any> {
    try {
      const response = await apiClient.post(`/api/admin/settings`, settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to save admin settings');
    }
  },

  // == Image Methods (if implemented) ==
  async generateImageFromStory(data: { prompt: string; user_id: string }): Promise<any> {
    try {
      const response = await apiClient.post('/api/image/generate-from-story', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate image');
    }
  },
};

export default api;





