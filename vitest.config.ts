import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    // This is the configuration section for Vitest
    globals: true,
    environment: 'jsdom',
    // THIS IS THE CRUCIAL LINE that tells Vitest to run our setup file
    setupFiles: ['./tests/setup.ts'],
  },
});
