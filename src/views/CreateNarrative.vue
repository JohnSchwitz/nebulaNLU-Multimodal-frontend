// CreateNarrative.vue
<template> 
  <div class="max-w-4xl mx-auto px-4 my-4">
    <div class="mb-8">
      <p class="text-lg font-didot leading-[1.2]">
        The AI Agent will create a NARRATIVE from your previous STORIES. 
        First, check the boxes of the stories you wish to include and click Start Narrative.
        These stories are placed in the ScrollBox permitting you to edit them. 
        After editing enter your contribution to the narrative in StoryTeller input. 
        The AI agent will then add to the narrative providing new twists as it weaves the stories together. 
        You may modify as many times as required and edit the result.
      </p>
    </div>

    <h2 class="text-2xl font-didot mb-4">Select Stories to Include</h2>
  
    <!-- Stories List -->
    <div class="bg-white rounded-lg p-6 shadow-lg mb-6">
    <table v-if="stories.length">
      <thead>
        <tr>
          <th></th>
          <th class="story-name-header">Story Name</th>
          <th class="story-content-header">Story</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="story in stories" :key="story.story_id">
          <td>
            <input type="checkbox" v-model="selectedStoryIds" :value="story.story_id">
          </td>
          <td class="story-name">{{ story.story_name }}</td>
          <td class="story-content">{{ story.story }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No stories found for this user.</p>
    <pre>{{ stories }}</pre> <div v-if="error" class="error-message">{{ error }}</div> <p v-if="!error && stories.length === 0">No stories found for this user.</p>
    <p class="mt-4">{{ selectedStoryIds.length }} stories selected.</p>
  </div>

    <div class="my-8">
      <h2 class="text-2xl font-bold font-didot text-center mb-4 leading-[1.2]">
        Instructions to Save Your Narrative and create a PDF
      </h2>
      <p class="text-lg font-didot text-left leading-[1.2]">
        1) At the prompt below click the Create Narrative BUTTON. You may then EDIT your narrative in the ScrollBox.
      </p>
      <p class="text-lg font-didot text-left leading-[1.2]">
        2) Enter a Narrative Name, Upload to Database, and then download a PDF.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-4 my-2">
      <label for="narrativeName" class="font-didot">Narrative Name</label>
      <input 
        type="text" 
        v-model="narrativeName" 
        id="narrativeName" 
        placeholder="your narrative name here" 
        class="border rounded px-3 py-2 w-48 font-didot"
      />
<!-- Upload to Database button -->
<button 
  @click="uploadToDatabase"
  :disabled="!isCompleted || !narrativeName.trim() || narrativeName === 'Narrative Title'"
  class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
>
  Upload to Database
</button>

<!-- Download PDF button -->
<button 
  @click="downloadPDF"
  :disabled="!isCompleted"
  class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
>
  Download PDF
</button>

<div class="flex flex-wrap items-center justify-between gap-4 mb-0 w-full">
  <p class="text-lg font-didot font-bold text-left leading-[1.2]">
    AI StoryCreator:
  </p>
  <!-- Start and Create Narrative button -->
  <button 
    @click="startNarrative"
    :disabled="!narrativeContent.trim()"
    class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Start Narrative
  </button>
  <button 
    @click="createNarrative"
    :disabled="!narrativeContent.trim()"
    class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Create Narrative
  </button>
        <div class="flex-grow text-center">
          <p class="text-xl font-didot font-bold">ScrollBox</p>
        </div>
        <div class="w-[140px]"></div>
</div>
</div> 

    <div class="bg-chatbox-light rounded-lg p-4 mb-4 min-h-[200px] max-h-[400px] overflow-y-auto">
      <div v-if="!isEditable" v-for="(message, index) in messages" 
          :key="index" 
          class="mb-3">
        <div :class="message.sender === 'AI' ? 'bg-white' : 'bg-white'" 
            class="rounded p-3 relative">
          <span class="text-black block" 
                :class="message.sender === 'AI' ? 'ml-0' : ''">
            {{ message.text }}
          </span>
        </div>
      </div>
      <textarea 
        v-if="isEditable"
        v-model="storyContent"
        class="flex-1 w-full h-full min-h-[200px] max-h-[600px] bg-white text-black p-3 rounded resize-y"
      ></textarea>
    </div>

    <div class="bg-chatbox-light rounded-lg p-4 flex gap-4 items-start">
      <textarea 
        v-model="narrativeInput" 
        placeholder="StoryTeller input:"
        rows="2"
        class="flex-1 bg-white placeholder-black resize-y p-2 focus:outline-none"
      ></textarea>
      <button 
        @click="sendNarrativeInput"
        :disabled="!narrativeInput.trim() || loading"
        class="bg-white text-black px-6 py-2 rounded font-bold text-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>

    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      <span class="block sm:inline">{{ error }}</span>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import api from '../services/api';

export default {
  name: 'CreateNarrative',
  data() {
    return {
      narrativeContent: "",
      narrativeName: "",
      userId: 1,
      stories: [],
      selectedStoryIds: [],
      selectedStories: [],
      messages: [{ sender: 'AI', text: `Creating a narrative from selected stories. The AI will weave together the elements into a cohesive narrative with new twists. You may modify as needed.` }],
      narrativeInput: "",
      loading: false,
      error: "",
      user_id: 1,
      isEditable: false,
      isCompleted: false,
      settingsVersion: 1,
      saveStatus: null, // Add saveStatus to data

    };
  },
  mounted() {
    axios.defaults.baseURL = import.meta.env.VITE_APP_API_URL;
    console.log("Component mounted. User ID:", this.userId);  // Verify userId
    this.fetchStories();
  },
  methods: {
    async fetchStories() {
        this.error = ""; // Clear previous errors
        try {
            const response = await axios.get(`/get_user_stories?user_id=${this.userId}&t=${Date.now()}`);
            if (Array.isArray(response.data)) {  // Check if data is array
                this.stories = response.data;

            } else {
                this.stories = []; // Set stories to an empty array if not an array.  Handle the case where an error was returned but wrapped in a 200 response
                this.error = "Invalid stories data. Please check the logs."
                console.error("Invalid stories data:", response.data)
            }


        } catch (error) {
            this.stories = []  // Clear the stories array if there's an error
            console.error("Error fetching stories:", error);
            this.error = "Failed to fetch stories. Please try again.";
        }
    },
    async startNarrative() {
      this.isEditable = false;
      this.messages = [];  // Clear previous messages
      this.narrativeContent = ""; // Clear the narrative content
      try {
        if (!this.selectedStories || this.selectedStories.length === 0) {
               this.error = "Please select at least one story.";
               return;
        }
        const storiesText = this.selectedStories.map(story => story.story).join('\n\n'); // Combine selected stories
        const response = await api.generateNarrative(storiesText);  // Pass combined stories text to API
        this.narrativeContent = response.data.narrative;
        this.messages.push({ sender: 'AI', text: response.data.narrative });
        this.isEditable = true;
      } catch (error) {
        this.error = "Failed to start narrative. Please try again.";
        console.error(error);
      }
    },
    async createNarrative() {
        try {
          if (!this.narrativeContent.trim()) {
             this.error = "Narrative content cannot be empty.";
             return; // Or throw an error
           }

            // Assuming you have an API route for /complete_narrative
           const response = await axios.post('/complete_narrative', {
                narrative_content: this.narrativeContent,
                settings_version: this.settingsVersion, // Assuming you need this
                // ... any other required parameters
           });
            this.narrativeContent = response.data.narrative // Assign response
           this.isEditable = true;
            this.isCompleted = true;

        } catch (error) {
            console.error("Error completing narrative:", error)
            this.error = "Failed to complete narrative."; // Or display specific error
        }
    },
    async sendNarrativeInput() {
            if (!this.narrativeInput.trim()) return;

            this.loading = true;
            this.error = ""; // Clear any previous errors

            try {
                this.messages.push({ sender: 'StoryTeller', text: this.narrativeInput });

                const response = await api.updateNarrative({ // Use API wrapper, send settingsVersion
                    user_id: this.user_id,
                    narrative_input: this.narrativeInput,
                    current_narrative: this.narrativeContent,
                    selected_stories: this.selectedStories,
                    settings_version: this.settingsVersion,
                });

                this.messages.push({ sender: 'AI', text: response.narrative });  // Use response.narrative
                this.narrativeContent = response.narrative; // Update narrativeContent
                this.narrativeInput = "";
            } catch (error) {
                console.error("Error updating narrative:", error);
                this.error = "Failed to update narrative. Please try again.";
            } finally {
                this.loading = false;
            }
    },
    async uploadToDatabase() {
       try {
            if (!this.narrativeContent || !this.narrativeName) {
                this.error = "Please create a narrative and enter a name before uploading.";
                return;
            }

            const response = await api.uploadNarrative({
                user_id: this.user_id,
                narrative_name: this.narrativeName,
                narrative_content: this.narrativeContent,
                source_stories: this.selectedStoryIds, // Or this.selectedStories if needed
            });

            this.saveStatus = true; // Set saveStatus to true on success
            setTimeout(() => {
                this.saveStatus = false;
            }, 3000);
        } catch (error) {
            console.error("Error uploading narrative:", error);
            this.error = "Failed to upload narrative. Please try again."; // Provide feedback to the user
        }

    },
    async downloadPDF() {   
            if (!this.narrativeContent) {
                this.error = "Please create a narrative before downloading a PDF.";
                return;
            }
            try {
                const pdfContent = await api.downloadNarrativePDF({
                    narrative_name: this.narrativeName,
                    narrative_content: this.narrativeContent,
                    selected_stories: this.selectedStories,
                });

                // Create a download link
                const link = document.createElement('a');
                const blob = new Blob([pdfContent], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob)

                link.href = url
                link.download = `${this.narrativeName}.pdf` // Or a default name
                link.click() // Trigger download

                URL.revokeObjectURL(url) // Release memory

            } catch (error) {
                console.error("Error downloading PDF:", error);
                this.error = "Failed to download PDF. Please try again."; // Or handle error as needed

            }
    },
    updateSelectedStories() {
      this.selectedStories = this.stories.filter(story => this.selectedStoryIds.includes(story.story_id));
    },
  },
    watch: { // The watch remains as it was: correct and necessary
        selectedStoryIds: {
            handler() {
                this.updateSelectedStories(); // Correct call to update selected stories
            },
            immediate: true, // Ensures initial filtering when stories are loaded
            deep: true,

        },
    },
};
</script>

<style scoped>
@font-face {
  font-family: 'Didot';
  src: url('@/assets/fonts/Didot.woff2') format('woff2'),
       url('@/assets/fonts/Didot.woff') format('woff');
  font-weight: normal;
  font-style: normal;
}

.font-didot {
  font-family: 'Didot', serif;
}
.error-message {
  color: red;
}
.story-name-header {
  width: 25%; /* 1/4 width for Story Name header */
}
.story-name {
  word-break: break-all; /* Wrap long story names */
  max-width: 25%;        /* Prevent overflowing the container */
}
.story-content-header {
  width: 75%; /* 3/4 width for Story header */
}
.story-content {
  white-space: pre-line; /* Preserve whitespace and line breaks */
  word-break: break-word; /* Wrap long words */
  max-width: 75%;         /* Takes 3/4 width */
}
</style>
