// CreateStory.vue
<template>
  <div class="max-w-4xl mx-auto px-4">
    <div class="mb-4">
      <p class="text-lg font-didot leading-[1.2]">
        Your turn to create a story. Provide as much detail on the characters, their names,
        the setting, and action or challenge in <b>StoryTeller input:</b>.
        <br><br>
        The <b>AI StoryCreator</b> will then create a story. You may interact with the StoryCreator
        as many times as required to alter or add to the story. Here is an example of AI StoryTelling:
        <router-link
          to="/example-story"
          class="text-blue-600 hover:text-blue-800 underline"
        >
          Fearless Princess Hazel
        </router-link>.
        If you wish to create PDF's or a NARRATIVE from previous stories click the Create Narrative button in the NAVAGATION line above.
      </p>
    </div>

    <div class="my-0">
      <h2 class="text-2xl font-didot font-bold text-center mb-4 leading-[1.2]">
        Instructions to Save Your Story and create a PDF
      </h2>
      <p class="text-lg font-didot text-left leading-[1.2]">
        1) At the prompt below click the Complete Story BUTTON to show your complete Story
        in the ScrollBox. You may then EDIT your story in the ScrollBox.
      </p>
      <p class="text-lg font-didot text-left leading-[1.2]">
        2) Then, enter a Story Name, Upload to Database, and download a PDF of the Story.
      </p>
    </div>
  </div>
  <div class="max-w-4xl mx-auto px-4">
    <div class="flex flex-wrap items-center gap-4 my-8">
      <label for="storyName" class="text-lg font-didot">Story Name</label>
      <input
        type="text"
        v-model="storyName"
        id="storyName"
        :placeholder="storyName.length === 0 ? 'Story Title' : ''"
        class="border rounded px-3 py-2 w-48 font-didot"
      />
      <button
        @click="uploadToDatabase"
        :disabled="!isCompleted || !isStoryNameValid"
        class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Upload to Database
      </button>
      <button
        @click="downloadPDF"
        :disabled="!isCompleted"
        class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Download PDF
      </button>
      <button
        @click="generateImage"
        :disabled="!isCompleted"
        class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Image
      </button>
    </div>

    <div v-if="loading" class="loading-spinner">
      <div class="spinner"></div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 mb-2 w-full">
      <p class="text-lg font-didot font-bold text-left leading-[1.2]">
        AI StoryCreator:
      </p>
      <!-- Complete Story button-->
      <button
        @click="completeStory"
        :disabled="loading"
        class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Complete Story
      </button>
      <div class="flex-grow text-center">
        <p class="text-xl font-didot font-bold">ScrollBox</p>
      </div>
      <div class="w-[140px]"></div>
    </div>

    <!-- ScrollBox -->
    <div class="bg-chatbox-light rounded-lg p-4 mb-4 min-h-[200px] max-h-[600px] overflow-y-auto">
      <textarea
        v-if="isEditable"
        v-model="storyContent"
        class="flex-1 w-full h-full min-h-[200px] max-h-[600px] bg-white text-black p-3 rounded resize-y"
      ></textarea>
      <div v-else v-for="(message, index) in messages" :key="index" class="mb-3">
        <div
          :class="message.sender === 'AI' ? 'bg-white text-black block p-3' : 'bg-white text-black block p-3'"
          class="rounded relative"
        >
          {{ message.text }}
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 mb-2 w-full">
      <p class="text-lg font-didot font-bold text-left leading-[1.2]">
        Send story to AI:
      </p>
      <!-- Send button-->
      <button
        @click="generateStory"
        :disabled="!storyTellerInput.trim() || loading"
        class="bg-white text-black px-4 py-2 rounded font-bold hover:bg-gray-100 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
      <div class="flex-grow text-center">
        <p class="text-xl font-didot font-bold"></p>
      </div>
      <div class="w-[140px]"></div>
    </div>
   
    <!-- StoryTeller Input -->
    <div class="bg-chatbox-light rounded-lg p-4 flex gap-4 items-start">
      <textarea
        v-model="storyTellerInput"
        placeholder="StoryTeller input:"
        rows="2"
        class="flex-1 bg-white placeholder-black resize-y p-2 focus:outline-none"
      ></textarea>
    </div>
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
      <span class="block sm:inline">{{ error }}</span>
    </div>
    <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import api from '../services/api'
import { ref, onMounted } from 'vue'
const API_URL = 'http://127.0.0.1:5000'

export default {
    name: 'CreateStory',
    data() {
        return {
            storyPrompt: `Create an ADVENTURE STORY with CHARACTERS, SETTING, ACTION, MOTIVATION, CHALLENGE and STORY LINE provided by the
              StoryTeller. Please introduce at least one SURPRISE CHARACTER to challenge the HERO and a PLOT TWIST. The Complete Story should 
              require between 4 and 7 submissions of approximately 150 words from the StoryTeller. Each submission should continue the 
              narrative from the previous. The Complete Story should be 1,000 to 1,500 words.`,
            storyContent: "",
            storyName: "",
            imageUrl: null,
            user_id: 1,
            messages: [],
            storyTellerInput: "",
            error: "",
            loading: false,
            isStoryStarted: false,
            isCompleted: false,
            isEditable: false,
            isFirstPrompt: true
        }
    },

    computed: {
        isStoryNameValid() {
            return this.storyName && this.storyName.trim() !== "Story Title"
        }
    },

    mounted() {
        axios.defaults.baseURL = import.meta.env.VITE_APP_API_URL
        // Initialize ScrollBox with instructions
        this.messages = [] // Clear first
        this.messages.push({ sender: 'AI', text: this.storyPrompt })
    },

    methods: {
      async generateStory() {
      if (!this.storyTellerInput.trim()) return;

      this.loading = true;
      this.error = "Generating story...";

      try {
        const requestData = {
          user_id: this.user_id,
          initial_prompt: this.storyTellerInput,
          current_story: this.storyContent,
        };

        if (this.isFirstPrompt) {
          requestData.system_prompt = this.storyPrompt;
          this.isFirstPrompt = false;
        }

        const response = await api.generateStory(requestData); // Use api wrapper
        this.messages = [];
        this.messages.push({ sender: 'AI', text: response });  // Update messages array
        this.storyContent = response;  //  Update Story Content
        this.storyTellerInput = "";
        this.error = "";
      } catch (error) {
        console.error("API Error:", error);
        this.error = "Failed to generate story. Please try again.";
      } finally {
        this.loading = false;
      }
    },

    async completeStory() {
        console.log('completeStory called')
        
        this.loading = true
        this.error = "Completing story..."  // Status message
        
        try {
            const response = await axios.post('http://127.0.0.1:5000/complete_story', {
                user_id: this.user_id,
                story_content: this.storyContent,
                complete_prompt: "Please provide the complete story incorporating all previous elements"  // Modified prompt
            })
            
            // Update ScrollBox with complete story
            this.storyContent = response.data.story
            this.isEditable = true
            this.isCompleted = true
            this.error = ""  // Clear status message on success
        } catch (error) {
            console.error('API Error:', error)
            this.error = "Failed to complete story"
        } finally {
            this.loading = false
        }
    },

// Then update all axios calls:
async uploadToDatabase() {
            if (!this.isCompleted || !this.isStoryNameValid) {
                this.error = "Please complete the story and provide a valid title.";
                return;
            }
            this.loading = true;
            this.error = "Saving to database..."; // Set the loading message here

            try {
                const response = await axios.post(`${API_URL}/save_story`, {
                    user_id: this.user_id,
                    story_name: this.storyName,
                    story_content: this.storyContent,
                });

                if (response.status >= 200 && response.status < 300) {
                    // Success handling (clear error, show success message, etc.)
                    this.error = "";
                    this.successMessage = `Story "${this.storyName}" saved successfully!`; // Use successMessage
                    setTimeout(() => { this.successMessage = ""; this.error = ""; }, 5000); // Clear messages
                } else {
                    throw new Error(`Failed to save: ${response.status} ${response.statusText}`);
                }


            } catch (error) {
                console.error("API Error:", error);
                this.error = "Failed to save story. Please try again."; // Display specific error message
            } finally {
                this.loading = false;
            }
        },

    async downloadPDF() {
    this.error = "Generating PDF..."; // Provide user feedback while PDF generates.

        if (!this.storyContent.trim()) return;

        this.loading = true;
        try {
            const response = await axios.post(`${API_URL}/generate_pdf`, {
                story_name: this.storyName,
                story_content: this.storyContent
            }, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${this.storyName || 'story'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // Release memory
             this.error = ""; // Clear if successful
        } catch (error) {
            console.error('API Error:', error);
            this.error = "Failed to generate PDF. Please try again.";
        } finally {
            this.loading = false;
        }
    },

    async generateImage() {
            this.error = "Not yet implemented"
            setTimeout(() => {
                this.error = ""
            }, 2000)  // Clear message after 2 seconds
        }
      }
}
</script>

<style scoped>
/* Your existing styles unchanged */
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
.page-container {
  max-width: 1000px;
   margin: 0 auto;
    text-align: left;
}
.instruction-dialog {
    margin-bottom: 20px;
  text-align: left;
}
textarea {
    width: 100%;
     box-sizing: border-box;
}
.chatbox{
   border: 1px solid black;
   min-height: 100px;
    max-height: 300px;
    overflow-y: scroll;
    padding: 10px;
    margin-bottom: 10px;
   background-color: gray;
}
.message-text {
  color: white;
  text-align: left;
}
.AI{
  color: blue;
   font-weight: bold;
  text-align: left;
}
.StoryTeller {
 color: green;
   font-weight: bold;
    text-align: left;
}
.instructions-area {
   margin-top: 20px;
    text-align: center;
}
.input-area {
   display: flex;
    align-items: center;
  width: 100%;
    margin-bottom: 10px;
}
.input-area textarea {
   flex: 1;
   margin-right: 10px;
   background-color: white;
}
.bottom-area {
   display: flex;
    align-items: center;
}
.story-name-input {
   flex: 0 0 200px; /* Limit the input to a specific size */
  margin-right: 10px;
}
.scrollbox-label {
  text-align: center;
  margin-bottom: 5px;
   font-weight: bold;
}
.loading-spinner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>