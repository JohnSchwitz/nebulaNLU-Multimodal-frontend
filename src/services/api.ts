import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AUTH_TOKEN_STORAGE_KEY = 'app_auth_token';
console.log(`API Service configured for URL: ${API_URL}`);

// --- Axios Client Setup ---
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// --- CRITICAL: Request Interceptor ---
// This block runs BEFORE every single API request is sent.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API Interceptor] Authorization header added to request.');
    } else {
      console.warn('[API Interceptor] No auth token found for this request.');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- TypeScript Interfaces ---
interface GhostAuthPayload {
  ghost_user_id: string;
  name?: string | null;
  email?: string | null;
}

interface UiTextsResponse {
    placeholderPrompts: string[];
    initialStoryGuidance: string;
}

// --- API Method Definitions ---
const api = {
  // Authentication
  async authenticateGhostUser(data: GhostAuthPayload): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/api/auth/ghost-token', data);
    return response.data;
  },

  // UI Texts (Now a real endpoint)
  async getUiTexts(): Promise<UiTextsResponse> {
    const response = await apiClient.get<UiTextsResponse>('/api/ui/texts');
    return response.data;
  },

  // Story Methods
  async startStory(data: { initial_prompt: string }): Promise<any> {
    const response = await apiClient.post('/api/story/start', data);
    return response.data;
  },

  async continueStory(data: { session_id: string; feedback: string }): Promise<any> {
    const response = await apiClient.post('/api/story/continue', data);
    return response.data;
  },

  async completeStory(data: { session_id: string }): Promise<any> {
    const response = await apiClient.post('/api/story/complete', data);
    return response.data;
  },

  async saveStory(data: { story_name: string; story_content: string; session_id?: string | null }): Promise<any> {
    const response = await apiClient.post('/api/story/save', data);
    return response.data;
  },

  async generateStoryPDF(data: { story_name: string; story_content: string }): Promise<Blob> {
    const response = await apiClient.post('/api/story/pdf/story', data, { responseType: 'blob' });
    return response.data;
  },
};

// Generic error handling wrapper
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
