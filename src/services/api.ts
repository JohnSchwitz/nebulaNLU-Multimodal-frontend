// src/services/api.ts
import axios from 'axios';

// Use environment variable for API URL, provide a sensible default for local dev
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080'; // Default to 8080 (Cloud Run common port) or 5000 if your Flask default is different
console.log("API Service configured for URL:", API_URL); // Log the URL being used

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    // 'Accept': 'application/json' // Often useful too
  },
  // withCredentials should generally be false unless dealing with CORS + Cookies
  withCredentials: false,
});


// --- Interceptors ---

// Request interceptor to add the authentication token
apiClient.interceptors.request.use(config => {
  // *** CRUCIAL: Use the CORRECT key for the token in localStorage ***
  // Adjust 'YOUR_AUTH_TOKEN_KEY' to match what your app actually stores
  // Examples: 'app_token', 'nebula_token', 'ghost-access-token' (if verifying Ghost token directly)
  const token = localStorage.getItem('YOUR_AUTH_TOKEN_KEY'); // <-- ADJUST THIS KEY

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // console.debug('Auth token added to request headers.'); // Uncomment for debugging
  } else {
    console.warn('Auth token not found in localStorage for request to:', config.url);
    // Consider if you want to block the request here if a token is always required
    // for protected endpoints. For now, we let it proceed and let the backend deny.
  }
  return config;
}, error => {
  // Handle request configuration errors
  console.error('Axios request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor for logging and potentially global error handling
apiClient.interceptors.response.use(
  response => response, // Simply return successful responses
  error => {
    // Log detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`API Error Response: ${error.response.status} ${error.response.statusText}`, {
        data: error.response.data,
        headers: error.response.headers,
        config: error.config, // The request config that triggered the error
      });
       // Handle specific errors globally if needed (e.g., 401 Unauthorized -> trigger logout)
       if (error.response.status === 401) {
           console.warn("Received 401 Unauthorized. Potential token expiry or invalid token.");
           // Example: Trigger logout action in Pinia store
           // import { useAuthStore } from '@/stores/authStore'; // Be careful with imports outside components
           // const authStore = useAuthStore();
           // authStore.logout(); // Assuming you have a logout action
           // Or redirect: window.location.href = '/signin';
       }
    } else if (error.request) {
      // The request was made but no response was received (e.g., network error, CORS block on server response)
      console.error('API Network Error: No response received.', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Setup Error:', error.message);
    }
    // Return a rejected promise to propagate the error
    return Promise.reject(error);
  }
);


// --- API Method Definitions ---
// Using apiClient ensures interceptors are applied

const api = {

  // Auth methods
  async verifyToken(token: string): Promise<any> {
    // Usually, token verification isn't done explicitly by the client like this.
    // The presence of a valid token is checked by calling protected endpoints.
    // This test endpoint might still be useful for debugging.
    console.warn("verifyToken called. Usually implicit via protected endpoints.");
    try {
      // Send token explicitly ONLY for this specific test endpoint
      const response = await apiClient.get(`/api/auth/test`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data; // Expects { success: true, user: {...} }
    } catch (error) {
      console.error('Token verification failed via /api/auth/test:', error);
      // Don't assume structure on error, just indicate failure
      return { success: false, error: 'Token verification failed' };
    }
  },

  // Story methods
  async saveStory(storyData: { story_name: string, story_content: string }): Promise<any> {
    // Relies on interceptor to add Authorization header
    try {
      const response = await apiClient.post(`/api/story/save`, storyData);
      return response.data; // Expects { story_id: ..., message: ... }
    } catch (error) {
      // Error already logged by interceptor
      // Throw a more specific error message if available from backend response
      throw new Error(error.response?.data?.error || 'Failed to save story');
    }
  },

  async getUserStories(): Promise<any[]> { // *** REMOVED userId parameter ***
    // Relies on interceptor for auth. Backend uses token to find user.
    try {
      const response = await apiClient.get(`/api/user/stories`);
      // Ensure we return an array, even if response.data is null/undefined
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      // Error logged by interceptor
      return []; // Return an empty array on error to prevent UI crashes
    }
  },

  // Narrative methods
  async generateNarrative(selectedStories: { story_id: string, content: string }[]): Promise<any> {
    // Prepare data for the backend endpoint
    // Backend expects: { selected_stories: [{story_id: '..', content: '..'}], narrative_theme?: '...' }
    // Your original code sent combined text. Adjust payload based on backend expectations.
    // Assuming backend now wants the list of objects:
    const payload = { selected_stories: selectedStories };
    // Add theme if you have it: payload.narrative_theme = 'Some Theme';

    try {
      // Ensure endpoint matches main.py: /api/narrative/generate
      const response = await apiClient.post(`/api/narrative/generate`, payload);
      return response.data; // Expects { narrative: "...", source_stories: [...] }
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to generate narrative');
    }
  },

  async saveNarrative(narrativeData: { narrative_name: string, narrative_content: string, source_stories: string[] }): Promise<any> {
      // Relies on interceptor for auth
      try {
        // Ensure endpoint matches main.py: /api/narrative/save
        const response = await apiClient.post('/api/narrative/save', narrativeData);
        return response.data; // Expects { narrative_id: ..., message: ... }
      } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to save narrative');
      }
  },

  async getUserNarratives(): Promise<any[]> { // *** REMOVED userId parameter ***
      // Relies on interceptor for auth
      try {
         // Ensure endpoint matches main.py: /api/narrative/user
         const response = await apiClient.get(`/api/narrative/user`);
         return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
         return [];
      }
  },

  // PDF methods
  async getStoryPdf(storyName: string, storyContent: string): Promise<Blob> {
      try {
          // Ensure endpoint matches main.py: /api/pdf/story
          const response = await apiClient.post('/api/pdf/story', {
              story_name: storyName,
              story_content: storyContent
          }, { responseType: 'blob' });
          if (!(response.data instanceof Blob)) throw new Error("Invalid PDF response data.");
          return response.data;
      } catch (error) {
          throw new Error(error.response?.data?.error || 'Failed to download story PDF');
      }
  },

  async getNarrativePdf(narrativeName: string, narrativeContent: string, sourceStories: string[]): Promise<Blob> {
      try {
           // Ensure endpoint matches main.py: /api/pdf/narrative
          const response = await apiClient.post('/api/pdf/narrative', {
              narrative_name: narrativeName,
              narrative_content: narrativeContent,
              source_stories: sourceStories || []
          }, { responseType: 'blob' });
          if (!(response.data instanceof Blob)) throw new Error("Invalid PDF response data.");
          return response.data;
      } catch (error) {
          throw new Error(error.response?.data?.error || 'Failed to download narrative PDF');
      }
  },

  // Image methods
  async generateImage(description: string): Promise<any> {
    // Relies on interceptor for auth
    try {
        // Ensure endpoint matches main.py
        const response = await apiClient.post(`/api/image/generate-from-story`, {
            specific_description: description
        });
        return response.data; // Expects { success: bool, image_url?: string, error?: string }
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to generate image');
    }
  },

  async modifyImage(originalDescription: string, modificationInstructions: string): Promise<any> {
      // Relies on interceptor for auth
      try {
          // Ensure endpoint matches main.py
          const response = await apiClient.post('/api/image/modify', {
              original_description: originalDescription,
              modification_instructions: modificationInstructions
          });
          return response.data; // Expects { success: bool, image_url?: string, ... }
      } catch (error) {
          throw new Error(error.response?.data?.error || 'Failed to modify image');
      }
  },

  async saveImage(imageData: { image_url: string, image_title?: string, image_description?: string }): Promise<any> {
      // Relies on interceptor for auth
      try {
          // Ensure endpoint matches main.py
          const response = await apiClient.post(`/api/image/save`, imageData);
          return response.data; // Expects { success: bool, image_id?: string, ... }
      } catch (error) {
          throw new Error(error.response?.data?.error || 'Failed to save image metadata');
      }
  },

  async getUserImages(): Promise<any[]> { // *** REMOVED userId parameter ***
      // Relies on interceptor for auth
      try {
          // Ensure endpoint matches main.py
          const response = await apiClient.get(`/api/image/user`);
          return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
          return [];
      }
  },

  async deleteImage(imageId: string): Promise<boolean> { // Use string for ID
      // Relies on interceptor for auth
      try {
          // Ensure endpoint matches main.py
          const response = await apiClient.delete(`/api/image/${imageId}`);
          return response.data.success === true; // Return boolean
      } catch (error) {
          return false; // Return false on failure
      }
  },

  async getImageDownloadUrl(imageId: string): Promise<string | null> { // Use string for ID
       // Relies on interceptor for auth
       try {
           // Ensure endpoint matches main.py
           const response = await apiClient.get(`/api/image/download-url/${imageId}`);
           if (response.data?.success && response.data?.signedUrl) {
               return response.data.signedUrl;
           } else {
                console.error("Failed to get signed URL from backend:", response.data?.message);
                return null;
           }
       } catch(error) {
           // Error logged by interceptor
           return null;
       }
  },

  // Admin Settings methods (keep original, assuming token implies admin access checked by backend)
  async getAdminSettings(): Promise<any> {
    try {
        const response = await apiClient.get(`/api/admin/settings`);
        return response.data;
    } catch (error) {
        // Returning defaults can hide backend errors. Consider re-throwing.
        console.error("Error fetching admin settings:", error);
        // throw new Error(error.response?.data?.error || 'Failed to fetch admin settings');
         return {}; // Return empty object instead of defaults?
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

   // --- Deprecated / To Remove based on main.py structure ---
   /*
   async get_user_stories(userId: number): Promise<any[]> { // REMOVE - Replaced by getUserStories()
      // ... old implementation ...
   },
   async generateStory(prompt: string): Promise<string> { // REMOVE - Replaced by standard text gen flow?
       // ... old implementation ...
   },
   async completeStory(content: string): Promise<string> { // REMOVE - Replaced by standard text gen flow?
       // ... old implementation ...
   },
   async uploadNarrative(narrativeData) { // REMOVE - Replaced by saveNarrative
       // ... old implementation ...
   },
   async downloadNarrativePDF(narrativeData) { // REMOVE - Replaced by getNarrativePdf
       // ... old implementation ...
   }
   // Remove the duplicate generateImage if present
   */

};

export default api;





