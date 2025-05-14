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
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      if (!config.headers) { // Ensure headers object exists
          config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
      // console.debug('Auth token added to request headers.'); // Uncomment for debugging
    } else {
      // This logs if no token is found, which is expected if user is not logged in
      // or if the token exchange hasn't happened yet.
      // console.warn(`Auth token not found in localStorage for request to: ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('Axios request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handles global error logging and specific statuses like 401
// src/services/api.ts
// ...
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig): AxiosRequestConfig => {
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
  // ...
);

// --- TypeScript Interfaces for Payloads and Responses ---
// (These match the interfaces from your provided api.ts, slightly adjusted for clarity)

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

interface StartStoryPayload {
  initial_prompt: string;
}

interface ContinueStoryPayload {
  session_id: string;
  feedback: string;
}

interface SaveStoryPayload {
  story_name: string;
  story_content: string;
  sessionId?: string | null; // sessionId is optional for saving if not part of a session
}

interface GenerateNarrativePayload {
  selected_stories: { story_id: string; content: string }[];
  narrative_theme?: string;
}

interface SaveNarrativePayload {
  narrative_name: string;
  narrative_content: string;
  source_stories: string[]; // Story IDs
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
      // This endpoint needs to exist on your backend (e.g., /api/auth/ghost-token)
      const response: AxiosResponse<AuthTokenResponse> = await apiClient.post(`/api/auth/ghost-token`, data);
      return response.data; // Expected: { token: "jwt_token_string" }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Backend authentication with Ghost ID failed');
    }
  },

  // == Story Methods (Session-Based) ==
  async startStory(data: StartStoryPayload): Promise<StorySegmentResponse> {
    try {
      const response: AxiosResponse<StorySegmentResponse> = await apiClient.post(`/api/story/start`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to start story session');
    }
  },

  async continueStory(data: ContinueStoryPayload): Promise<StorySegmentResponse> {
    try {
      const response: AxiosResponse<StorySegmentResponse> = await apiClient.post(`/api/story/continue`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to continue story session');
    }
  },

  async completeStory(sessionId: string): Promise<FinalStoryResponse> {
    try {
      const response: AxiosResponse<FinalStoryResponse> = await apiClient.post(`/api/story/complete`, { session_id: sessionId });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to complete story session');
    }
  },

  // == Story Persistence ==
  async saveStory(data: SaveStoryPayload): Promise<SaveResponse> {
    try {
      // Backend expects story_name, story_content. User identification via token.
      const payloadToBackend = {
          story_name: data.story_name,
          story_content: data.story_content,
          // sessionId is optional, pass if available and backend uses it.
          ...(data.sessionId && { session_id: data.sessionId })
      };
      const response: AxiosResponse<SaveResponse> = await apiClient.post(`/api/story/save`, payloadToBackend);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to save story');
    }
  },

  // `userId` param removed as backend should use token for identification
  async getUserStories(): Promise<any[]> {
    try {
      // Path from main.py (uses token)
      const response = await apiClient.get(`/api/user/stories`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return []; // Return an empty array on error
    }
  },

  // == Narrative Methods ==
  async generateNarrative(data: GenerateNarrativePayload): Promise<NarrativeResponse> {
    try {
      const response: AxiosResponse<NarrativeResponse> = await apiClient.post(`/api/narrative/generate`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to generate narrative');
    }
  },

  async saveNarrative(data: SaveNarrativePayload): Promise<SaveResponse> {
    try {
      // User identification via token
      const response: AxiosResponse<SaveResponse> = await apiClient.post(`/api/narrative/save`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to save narrative');
    }
  },

  // `userId` param removed as backend should use token for identification
  async getUserNarratives(): Promise<any[]> {
    try {
      // Path from main.py (uses token)
      const response = await apiClient.get(`/api/narrative/user`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  // == PDF Methods ==
  async generateStoryPDF(data: { story_name: string; story_content: string }): Promise<Blob> {
    try {
      const response = await apiClient.post('/api/pdf/story', data, { responseType: 'blob' });
      if (!(response.data instanceof Blob)) {
        throw new Error("Invalid PDF response data from server.");
      }
      return response.data;
    } catch (error) {
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

  async generateNarrativePDF(data: { narrative_name: string; narrative_content: string; source_stories: string[] }): Promise<Blob> {
    try {
      const response = await apiClient.post('/api/pdf/narrative', data, { responseType: 'blob' });
      if (!(response.data instanceof Blob)) {
        throw new Error("Invalid PDF response data from server.");
      }
      return response.data;
    } catch (error) {
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
  async getAdminSettings(): Promise<any> {
    try {
      const response = await apiClient.get(`/api/admin/settings`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch admin settings');
    }
  },

  async saveAdminSettings(settings: any): Promise<any> {
    try {
      const response = await apiClient.post(`/api/admin/settings`, settings);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to save admin settings');
    }
  },

  // You can add other API methods from your services/api.js as needed
  // (e.g., for Image management, Story History, etc.)
};

export default api;





