// src/services/api.ts
import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig } from 'axios'; // Correct way to import types

// --- Configuration ---
// For deployment, VITE_API_URL should be set in your build environment (e.g., Netlify, Vercel, Docker env)
// It should point to your *deployed* backend API URL.
// For local development, it falls back to http://127.0.0.1:5000.
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const AUTH_TOKEN_STORAGE_KEY = 'app_auth_token'; // Consistent key for storing the backend token

console.log(`API Service configured for URL: ${API_URL}`);
if (import.meta.env.PROD && API_URL === 'http://127.0.0.1:5000') {
    console.warn(
        'WARNING: Application is in PRODUCTION mode but API_URL is set to localhost. ' +
        'Ensure VITE_API_URL is correctly set in your deployment environment.'
    );
}

// --- Axios Client Setup ---
const apiClient = axios.create({
  baseURL: API_URL,
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

interface NarrativeResponse {
  narrative: string;
  source_stories?: string[]; // Assuming these are story IDs or names
}

// Updated interfaces with user_id
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

interface GenerateNarrativePayload {
  selected_stories: { story_id: string; content: string }[];
  narrative_theme?: string;
  user_id: string;
}

interface SaveNarrativePayload {
  narrative_name: string;
  narrative_content: string;
  source_stories: string[]; // Story IDs
  user_id: string;
}

interface PdfStoryPayload {
  story_name: string;
  story_content: string;
  user_id: string;
}

interface PdfNarrativePayload {
  narrative_name: string;
  narrative_content: string;
  source_stories: string[];
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

  // == Narrative Methods ==
  async generateNarrative(data: GenerateNarrativePayload): Promise<NarrativeResponse> {
    try {
      const response: AxiosResponse<NarrativeResponse> = await apiClient.post(`/api/narrative/generate`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to generate narrative');
    }
  },

  async saveNarrative(data: SaveNarrativePayload): Promise<SaveResponse> {
    try {
      const response: AxiosResponse<SaveResponse> = await apiClient.post(`/api/narrative/save`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to save narrative');
    }
  },

  async getUserNarratives(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/narrative/user?user_id=${encodeURIComponent(userId)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('Error fetching user narratives:', error);
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

  async generateNarrativePDF(data: PdfNarrativePayload): Promise<Blob> {
    try {
      const response = await apiClient.post('/api/pdf/narrative', data, { responseType: 'blob' });
      if (!(response.data instanceof Blob)) {
        throw new Error("Invalid PDF response data from server.");
      }
      return response.data;
    } catch (error: any) {
      const errMessage = "Failed to download narrative PDF.";
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

  async saveImage(data: { image_url: string; metadata: any; user_id: string }): Promise<any> {
    try {
      const response = await apiClient.post('/api/image/save', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to save image');
    }
  },

  async getUserImages(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/api/image/user?user_id=${encodeURIComponent(userId)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      console.error('Error fetching user images:', error);
      return [];
    }
  }
};

export default api;





