// src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

// Configure axios with CORS headers
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = false; // Set to true if using cookies

// Add axios interceptor for better error logging
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

const api = {
      async getAdminSettings(): Promise<any> { // Correct return type
        try {
            const response = await axios.get(`${API_URL}/api/admin/settings`);
            return response.data;
        } catch (error) {
            console.error("Error fetching admin settings:", error);
            // Important: Return a default object if the API call fails
            return {
                apiKey: '',
                temperature: 0.7,  // Provide default values
                maxTokens: 1000,
                storyInstructions: '',
                narrativeInstructions: '',
                versionNumber: 1   // Default version number
            };
        }
    },
    async saveAdminSettings(settings: any): Promise<any> { // Correct parameter type
        try {
            const response = await axios.post(`${API_URL}/api/admin/settings`, settings);
            return response.data;
        } catch (error) {
            console.error("Error saving admin settings:", error);
            throw error; // Re-throw if you want the component to handle the error
        }
    },
    async get_user_stories(userId: number): Promise<any[]> {
        try {
            const response = await axios.get(`${API_URL}/get_user_stories?user_id=${userId}`);
            return response.data;
        } catch (error) {
            console.error("Error getting user stories", error);
            return []; // Return an empty array to avoid errors in components
        }
    },
    async generateNarrative(selectedStories) {
      const storiesText = selectedStories.map(story => story.story).join('\n\n'); // Combine stories
      try {
        const response = await axios.post(`${API_URL}/generate_narrative`, { selected_stories: storiesText });
        return response.data;
      } catch (error) {
        console.error("Error generating narrative:", error);
        throw error;
      }
    },
    async generateStory(prompt: string): Promise<string> {
        try {
            const response = await axios.post(`${API_URL}/create_story`, { prompt });
            return response.data.story;
        } catch (error) {
            throw new Error('Failed to generate story. Please try again.');
        }
    },

    async completeStory(content: string): Promise<string> {
        try {
            const response = await axios.post(`${API_URL}/complete_story`, { content });
            return response.data.story
        } catch (error) {
            throw new Error('Failed to complete story')
        }
    },
    async saveStory(userId, storyName, storyContent) {
        try {
            const response = await axios.post("/save_story", {
                user_id: userId,
                story_name: storyName,
                story_content: storyContent
            });
            return response.data.story_id;
        } catch (error) {
            throw new Error("Failed to save story");
        }
    },
    async uploadNarrative(narrativeData) {
      try {
          const response = await axios.post('/save_narrative', narrativeData);  // Adjust route if needed
          return response.data; // Return API response if needed
      } catch (error) {
          console.error('Error uploading narrative:', error);
          throw error; // Or handle the error as needed
      }
  },
  async downloadNarrativePDF(narrativeData) {
      try {
          const response = await axios.post('/generate_narrative_pdf', narrativeData, { responseType: 'blob' }); // Correct route, set responseType
          return response.data;
      } catch (error) {
          console.error('Error downloading PDF:', error);
          throw error; // Or handle the error appropriately
      }
  },
  async generateImage(description: string): Promise<any> {
    try {
        const response = await axios.post(`/api/image/generate-from-story`, {
            specific_description: description
        });
        return response.data;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
},

  async saveImage(imageData: any): Promise<any> {
      try {
          const response = await axios.post(`${API_URL}/api/image/save`, imageData);
          return response.data;
      } catch (error) {
          console.error("Error saving image:", error);
          throw error;
      }
  },

  async getUserImages(userId: number): Promise<any[]> {
    try {
        const response = await axios.get(`/api/image/user`, {
            params: { user_id: userId }
        });
        return response.data;
    } catch (error) {
        console.error("Error getting user images:", error);
        return [];
    }
  },

  async deleteImage(imageId: number): Promise<boolean> {
      try {
          const response = await axios.delete(`${API_URL}/api/image/delete/${imageId}`);
          return response.data.success;
      } catch (error) {
          console.error("Error deleting image:", error);
          return false;
      }
  }
};

export default api;






