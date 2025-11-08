const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // This 'e2e' block configures your end-to-end tests
  e2e: {
    // The base URL of your application. Cypress will automatically visit this
    // when you use `cy.visit('/')`.
    // This should match the port your Vue dev server runs on.
    baseUrl: 'http://localhost:5173',

    // This function runs before your test files are executed.
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },

    // The file extension pattern for your test files.
    // This tells Cypress to look for files like `CreateStory.cy.ts`.
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },

  // This 'component' block is for component testing.
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
  },

  // Global configurations
  defaultCommandTimeout: 5000,
});
