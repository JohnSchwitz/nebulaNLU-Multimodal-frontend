// src/histoire.setup.ts
import { createPinia } from 'pinia';
import { defineSetupVue3 } from '@histoire/plugin-vue';

export const setupVue3 = defineSetupVue3(({ app }) => {
  // Create and install Pinia
  const pinia = createPinia();
  app.use(pinia);
});
