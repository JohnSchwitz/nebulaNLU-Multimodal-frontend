import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [
    HstVue(),
  ],

  // Only look for story files in the src directory.
  storyMatch: [
    'src/**/*.story.vue'
  ],

  setupFile: '/src/histoire.setup.ts',

  // Organize stories into a single "Views" group and remove the rest.
  tree: {
    groups: [
      {
        id: 'views',
        title: 'Views',
      },
    ],
  },
})
