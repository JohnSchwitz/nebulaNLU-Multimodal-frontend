// src/services/api.ts
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

console.log(`✅ API configured for: ${API_URL}`);

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
    console.log('🔑 JWT token added to request')
  } else {
    console.log('[API Interceptor] No auth token found for this request.')
  }

  console.log(`[API] Request to: ${url}`)

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // CHANGED: Don't send cookies (we use JWT)
      signal: controller.signal,
      mode: 'cors', // Explicitly set CORS mode
    })

    clearTimeout(timeoutId)

    console.log(`[API] Response status: ${response.status}`)

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

    const data = await response.json()
    console.log('[API] Response received successfully')
    return data

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
  // Authentication
  async authenticateGhostUser(data: {
    ghost_user_id: string;
    name?: string;
    email?: string;
  }) {
    console.log('[API] Authenticating Ghost user:', data.ghost_user_id);
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

  // Story operations
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

  // UI configuration
  async getUiTexts() {
    console.log('[API] Fetching UI texts');
    return apiFetch(`${API_URL}/api/ui/texts`, {
      method: 'GET'
    });
  },

  // Image generation
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
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for image generation

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

    // Return blob instead of JSON
    const blob = await response.blob()
    console.log('[API] Image generated successfully');
    return blob;

  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('Image generation timeout - please try again')
    }

    console.error('[API] Image generation failed:', error)
    throw error
  }
},

  // Health check
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
