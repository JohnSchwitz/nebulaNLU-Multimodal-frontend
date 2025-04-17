// AdminView.vue
<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1>Admin Settings</h1>

    <div class="bg-white rounded-lg p-6 shadow-lg mb-8">
      <label>Version Number</label>
      <input type="number" v-model.number="versionNumber" placeholder="Enter Version Number" class="w-full p-2 border rounded" />
      <div v-if="!versionNumberValid" class="text-red-500">Version Number is required and must be an integer.</div>
    </div>

    <div class="bg-white rounded-lg p-6 shadow-lg mb-8">
      <h2>Story Creator Instructions</h2>
      <div class="space-y-6">
        <div>
          <label>Initial AI StoryCreator Instructions</label>
          <textarea v-model="storyInstructions" rows="4" placeholder="Enter instructions for Story Creation..." class="w-full p-2 border rounded resize-y font-didot"></textarea>
          <div v-if="!storyInstructions" class="text-red-500">Story Creator Instructions are required</div>
        </div>

        <div>
          <label>Initial Narrative Creator Instructions</label>
          <textarea v-model="narrativeInstructions" rows="4" placeholder="Enter instructions for Narrative Creation..." class="w-full p-2 border rounded resize-y font-didot"></textarea>
          <div v-if="!narrativeInstructions" class="text-red-500">Narrative Creator Instructions are required</div>
        </div>
      </div>
    </div>


    <div class="bg-white rounded-lg p-6 shadow-lg mb-8">
      <h2>Gemini API Configuration</h2>
        <div> <label>API Key</label>
        <input
            type="password"
            v-model="apiKey"
            placeholder="Enter Gemini API Key"
            class="w-full p-2 border rounded"
        />
        <div v-if="!apiKey" class="text-red-500">API Key is required</div>
    </div>
        <div>
        <label>Temperature</label>
        <input type="number" v-model.number="temperature" min="0" max="1" step="0.1" class="w-full p-2 border rounded"/>
        <div v-if="!temperatureValid" class="text-red-500">Temperature is required and must be a number between 0 and 1.</div>
    </div>
      <div> <label>Max Tokens</label> <input type="number" v-model.number="maxTokens" class="w-full p-2 border rounded" />
          <div v-if="!maxTokensValid" class="text-red-500">Max Tokens is required and must be a positive integer.</div>
      </div>
  </div>
 <div class="flex justify-between items-center">
        <button
                :disabled="!isFormValid"
                class="bg-nebula-yellow text-black px-6 py-3 rounded font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Save Settings
        </button>
        <button @click="logout" class="bg-red-500 text-white px-6 py-3 rounded font-bold hover:bg-opacity-90">
            Logout
        </button>
    </div>

    <div v-if="saveStatus" class="mt-4 text-green-500 text-center">
        Settings saved successfully!
    </div>
</div>
</template>
<script>
import axios from 'axios'
import api from '@/services/api' // Make sure this path is correct

export default {
    name: 'AdminView',
    data() {
        return {
            apiKey: null,
            temperature: null,
            maxTokens: null,
            storyInstructions: null,
            narrativeInstructions: null,
            versionNumber: null,
            saveStatus: false,
            isAuthenticated: false,
            settingsLoaded: false
        }
    },
    computed: {
        versionNumberValid() {
            return this.versionNumber !== null && Number.isInteger(this.versionNumber) && this.versionNumber > 0
        },
        temperatureValid() {
            return this.temperature !== null && !isNaN(this.temperature) && this.temperature >= 0 && this.temperature <= 1
        },
        maxTokensValid() {
            return this.maxTokens !== null && Number.isInteger(this.maxTokens) && this.maxTokens > 0
        },
        isFormValid() {
            return (
                this.versionNumberValid &&
                this.storyInstructions &&  // Check if not null or empty after trim
                this.narrativeInstructions &&
                this.apiKey &&
                this.temperatureValid &&
                this.maxTokensValid
            )
        }
    },
    async created() {
        this.isAuthenticated = localStorage.getItem('isAdmin') === 'true'
        if (!this.isAuthenticated) {
            await this.$router.push('/admin-login')
            return
        }
        // Load settings
        try {
            const settings = await api.getAdminSettings()
            this.versionNumber = settings.versionNumber || 1
            this.storyInstructions = settings.storyInstructions
            this.narrativeInstructions = settings.narrativeInstructions
            this.apiKey = settings.apiKey
            this.temperature = settings.temperature
            this.maxTokens = settings.maxTokens
            this.settingsLoaded = true // Set after loading
        } catch (error) {
            console.error('Error fetching admin settings:', error)
            // Optionally, set default values if the API call fails
        }

    },


    methods: {


        async saveSettings() {
            if (this.isFormValid) {  // Only proceed if form is valid
                try {
                    const settings = {
                        apiKey: this.apiKey,
                        temperature: this.temperature,
                        maxTokens: this.maxTokens,
                        storyInstructions: this.storyInstructions,
                        narrativeInstructions: this.narrativeInstructions,
                        versionNumber: this.versionNumber
                    }
                    await api.saveAdminSettings(settings)
                    this.saveStatus = true
                    setTimeout(() => {
                        this.saveStatus = false
                    }, 3000)
                } catch (error) {
                    console.error('Error saving settings:', error)
                }
            }
        },
        logout() {
            localStorage.removeItem('isAdmin')
            this.$router.push('/')
        },

    }
}

</script>






