// src/services/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

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
};

export default api;






