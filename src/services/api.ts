import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig } from 'axios';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const AUTH_TOKEN_STORAGE_KEY = 'app_auth_token';
console.log(`API Service configured for URL: ${API_URL}`);

// --- Axios Client Setup (No changes needed here) ---
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// --- Interceptors (No changes needed here) ---
apiClient.interceptors.request.use(/* ... your existing interceptor is perfect ... */);
apiClient.interceptors.response.use(/* ... your existing interceptor is fine ... */);

// --- TypeScript Interfaces (SIMPLIFIED) ---
// Payloads no longer need user_id
interface StartStoryPayload {
  initial_prompt: string;
}
interface ContinueStoryPayload {
  session_id: string;
  feedback: string;
}
interface CompleteStoryPayload {
  session_id: string;
}
interface SaveStoryPayload {
  story_name: string;
  story_content: string;
  session_id?: string | null;
}
interface PdfStoryPayload {
  story_name: string;
  story_content: string;
}
interface GhostAuthPayload {
  ghost_user_id: string;
}

// Response interfaces to match FastAPI models
interface AuthTokenResponse {
  token: string;
}
interface StorySegmentResponse {
  session_id: string;
  story: string; // Ensure this matches the backend model field name
  iteration: number;
  is_complete: boolean;
  next_prompt_for_user: string;
}
interface StoryCompleteResponse {
  session_id: string;
  full_story: string;
  iteration: number;
  is_complete: boolean;
}
interface SaveResponse {
  story_id: string;
  message: string;
}

// --- API Method Definitions (SIMPLIFIED) ---
const api = {
  // ADD THIS FUNCTION
  async getUiTexts(): Promise<any> {
    // This endpoint might not exist yet on your backend, but we can add it.
    // For now, let's return a default to prevent the error.
    // In a real scenario, you would create a '/api/ui/texts' route in FastAPI.
    console.warn("Using mock UI texts. Create a real endpoint for this.");
    return Promise.resolve({
        placeholderPrompts: ["What amazing adventure awaits?", "Tell me more..."],
        initialStoryGuidance: "Welcome! Please enter your story idea below to begin this epic journey."
    });
  },

  async authenticateGhostUser(data: GhostAuthPayload): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>('/api/auth/ghost-token', data);
    return response.data;
  },

  async startStory(data: StartStoryPayload): Promise<StorySegmentResponse> {
    const response = await apiClient.post<StorySegmentResponse>('/api/story/start', data);
    return response.data;
  },

  async continueStory(data: ContinueStoryPayload): Promise<StorySegmentResponse> {
    const response = await apiClient.post<StorySegmentResponse>('/api/story/continue', data);
    return response.data;
  },

  async completeStory(data: CompleteStoryPayload): Promise<StoryCompleteResponse> {
    const response = await apiClient.post<StoryCompleteResponse>('/api/story/complete', data);
    return response.data;
  },

  async saveStory(data: SaveStoryPayload): Promise<SaveResponse> {
    const response = await apiClient.post<SaveResponse>('/api/story/save', data);
    return response.data;
  },

  async getUserStories(): Promise<any[]> {
    // The user is identified by the token, no need to send ID
    const response = await apiClient.get('/api/story/user/stories');
    return response.data;
  },

  async generateStoryPDF(data: PdfStoryPayload): Promise<Blob> {
    const response = await apiClient.post('/api/story/pdf/story', data, { responseType: 'blob' });
    if (!(response.data instanceof Blob)) {
      throw new Error("Invalid PDF response data from server.");
    }
    return response.data;
  },

  // Other methods like getUiTexts, getAdminSettings etc. would follow the same pattern.
  // The key is that they no longer need to send a user_id in the payload or query string.
};

// Generic error handling wrapper (optional but good practice)
Object.keys(api).forEach((key) => {
    const originalFunc = api[key];
    api[key] = async (...args) => {
        try {
            return await originalFunc(...args);
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message || 'An unknown API error occurred.';
            console.error(`API call to '${key}' failed:`, errorMessage);
            throw new Error(errorMessage);
        }
    };
});

export default api;





