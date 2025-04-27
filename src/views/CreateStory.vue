<!-- CreateStory.vue -->
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
        1) Build your story through multiple interactions with the AI StoryCreator.
      </p>
      <p class="text-lg font-didot text-left leading-[1.2]">
        2) When satisfied, use the "Complete Story" button to finalize your story.
      </p>
      <p class="text-lg font-didot text-left leading-[1.2]">
        3) Enter a Story Name, then Upload to Database or download a PDF.
      </p>
      <p class="text-lg font-didot text-left leading-[1.2]">
        4) Generate an image based on your story to bring it to life visually.
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
        @click="openImageDialog"
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
        <span v-if="sessionId" class="text-sm font-normal">(Iteration {{ currentIteration }})</span>
      </p>
      <!-- Complete Story button-->
      <button
        @click="completeStory"
        :disabled="loading || !sessionId"
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

    <!-- Generated Image Display Area -->
    <div v-if="generatedImage" class="mb-6">
      <h3 class="text-xl font-didot font-bold mb-2">Generated Image</h3>
      <div class="bg-white p-4 rounded-lg shadow">
        <img :src="generatedImage" alt="Generated story image" class="mx-auto max-w-full h-auto rounded" />
        <p v-if="imageDescription" class="mt-3 text-sm italic font-didot">{{ imageDescription }}</p>
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
        {{ sessionId ? 'Continue Story' : 'Start Story' }}
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
        :placeholder="sessionId ? 'Provide feedback or direction for the next part...' : 'Describe the story you want to create...'"
        rows="2"
        class="flex-1 bg-white placeholder-black resize-y p-2 focus:outline-none"
      ></textarea>
    </div>
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4">
      <span class="block sm:inline">{{ error }}</span>
    </div>
    <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4">
      <span class="block sm:inline">{{ successMessage }}</span>
    </div>
    <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="spinner"></div>
    </div>
  </div>

  <!-- Image Generation Dialog -->
  <div v-if="showImageDialog" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
      <h2 class="text-xl font-didot font-bold mb-4">Generate an Image from Your Story</h2>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Describe the scene you want to visualize:
        </label>
        <textarea
          v-model="imagePrompt"
          rows="4"
          class="w-full border rounded-md p-2 text-black"
          placeholder="Describe a specific scene from your story that you'd like to see as an image..."
        ></textarea>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-600">
          <span class="font-bold">Tip:</span> Provide specific details about characters, settings, and the specific moment you want to capture.
        </p>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="closeImageDialog"
          class="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 font-didot"
        >
          Cancel
        </button>
        <button
          @click="generateImage"
          :disabled="!imagePrompt.trim() || imageGenerating"
          class="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 font-didot disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ imageGenerating ? 'Generating...' : 'Generate Image' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
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
            user_id: 1,
            messages: [],
            storyTellerInput: "",
            error: "",
            successMessage: "",
            loading: false,
            isCompleted: false,
            isEditable: false,
            sessionId: null,
            currentIteration: 0,

            // Image generation related properties
            showImageDialog: false,
            imagePrompt: "",
            imageGenerating: false,
            generatedImage: null,
            imageDescription: ""
        }
    },

    computed: {
        isStoryNameValid() {
            return this.storyName && this.storyName.trim() !== "Story Title"
        }
    },

    mounted() {
        axios.defaults.baseURL = import.meta.env.VITE_APP_API_URL || API_URL
        // Initialize ScrollBox with instructions
        this.messages = []
        this.messages.push({ sender: 'AI', text: this.storyPrompt })
    },

    methods: {
        async generateStory() {
            if (!this.storyTellerInput.trim()) return;

            this.loading = true;
            this.error = this.sessionId ? "Continuing story..." : "Starting new story...";

            try {
                let response;

                if (!this.sessionId) {
                    // Starting a new story
                    response = await axios.post(`${API_URL}/api/story/start`, {
                        user_id: this.user_id,
                        initial_prompt: this.storyTellerInput,
                        system_prompt: this.storyPrompt
                    });

                    this.sessionId = response.data.session_id;
                    this.currentIteration = response.data.iteration;
                } else {
                    // Continuing an existing story
                    response = await axios.post(`${API_URL}/api/story/continue`, {
                        session_id: this.sessionId,
                        feedback: this.storyTellerInput
                    });

                    this.currentIteration = response.data.iteration;
                }

                // Update the messages
                this.messages.push({ sender: 'StoryTeller', text: this.storyTellerInput });
                this.messages.push({ sender: 'AI', text: response.data.story });

                // Update story content (append)
                if (this.storyContent) {
                    this.storyContent += "\n\n" + response.data.story;
                } else {
                    this.storyContent = response.data.story;
                }

                // Check if story is complete
                this.isCompleted = response.data.complete;
                if (this.isCompleted) {
                    this.isEditable = true;
                }

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
            if (!this.sessionId) {
                this.error = "Please start a story first.";
                return;
            }

            this.loading = true;
            this.error = "Completing story...";

            try {
                const response = await axios.post(`${API_URL}/api/story/complete`, {
                    session_id: this.sessionId
                });

                // Update the content with the complete story
                this.storyContent = response.data.story;
                this.currentIteration = response.data.iteration;
                this.isCompleted = true;
                this.isEditable = true;

                // Add to messages
                this.messages.push({
                    sender: 'AI',
                    text: "COMPLETE STORY:\n\n" + response.data.story
                });

                // Suggest using the image generator
                setTimeout(() => {
                    this.successMessage = "Story completed! Consider generating an image to bring your story to life.";
                    setTimeout(() => {
                        this.successMessage = "";
                    }, 5000);
                }, 1000);

                this.error = "";
            } catch (error) {
                console.error('API Error:', error);
                this.error = "Failed to complete story";
            } finally {
                this.loading = false;
            }
        },

        async uploadToDatabase() {
            if (!this.isCompleted || !this.isStoryNameValid) {
                this.error = "Please complete the story and provide a valid title.";
                return;
            }

            this.loading = true;
            this.error = "Saving to database...";

            try {
                const response = await axios.post(`${API_URL}/api/story/save`, {
                    user_id: this.user_id,
                    story_name: this.storyName,
                    story_content: this.storyContent,
                });

                if (response.status >= 200 && response.status < 300) {
                    this.error = "";
                    this.successMessage = `Story "${this.storyName}" saved successfully!`;
                    setTimeout(() => {
                        this.successMessage = "";
                    }, 5000);
                } else {
                    throw new Error(`Failed to save: ${response.status} ${response.statusText}`);
                }
            } catch (error) {
                console.error("API Error:", error);
                this.error = "Failed to save story. Please try again.";
            } finally {
                this.loading = false;
            }
        },

        async downloadPDF() {
            if (!this.isCompleted) {
                this.error = "Please complete the story first.";
                return;
            }

            this.error = "Generating PDF...";

            if (!this.storyContent.trim()) return;

            this.loading = true;
            try {
                const response = await axios.post(`${API_URL}/api/pdf/story`, {
                    story_name: this.storyName || "My Story",
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
                window.URL.revokeObjectURL(url);
                this.error = "";
            } catch (error) {
                console.error('API Error:', error);
                this.error = "Failed to generate PDF. Please try again.";
            } finally {
                this.loading = false;
            }
        },

        // Image dialog controls
        openImageDialog() {
            if (!this.isCompleted) {
                this.error = "Please complete the story first.";
                return;
            }

            // Pre-populate with a generic prompt suggestion
            if (!this.imagePrompt) {
                this.imagePrompt = "Create an image that captures the most visually interesting scene from my story.";
            }

            this.showImageDialog = true;
        },

        closeImageDialog() {
            this.showImageDialog = false;
        },

        async generateImage() {
            if (!this.imagePrompt.trim()) {
                return;
            }

            this.imageGenerating = true;
            this.closeImageDialog();
            this.loading = true;
            this.error = "Generating image...";

            try {
                const response = await axios.post(`${API_URL}/api/image/generate-from-story`, {
                    story_text: this.storyContent,
                    specific_description: this.imagePrompt
                });

                if (response.data.success) {
                    this.generatedImage = response.data.image_url;
                    this.imageDescription = response.data.visual_description;
                    this.successMessage = "Image generated successfully!";
                    setTimeout(() => {
                        this.successMessage = "";
                    }, 5000);
                } else {
                    throw new Error(response.data.message || "Failed to generate image");
                }

                this.error = "";
            } catch (error) {
                console.error("API Error:", error);
                this.error = "Failed to generate image. Please try again.";
            } finally {
                this.imageGenerating = false;
                this.loading = false;
            }
        },

        resetStory() {
            this.sessionId = null;
            this.currentIteration = 0;
            this.storyContent = "";
            this.isCompleted = false;
            this.isEditable = false;
            this.messages = [];
            this.messages.push({ sender: 'AI', text: this.storyPrompt });
            this.storyTellerInput = "";
            this.generatedImage = null;
            this.imageDescription = "";
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
