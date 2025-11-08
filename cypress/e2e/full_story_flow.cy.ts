describe('Full End-to-End Story Creation and Management', () => {
  // This block runs before each test begins.
  beforeEach(() => {
    // Load the test data from our fixture file and make it available as `this.storyData`
    cy.fixture('quantum_adventure.json').as('storyData');

    // ** BYPASS AUTHENTICATION **
    // We set the localStorage items to trick the app into thinking we are logged in.
    cy.window().then((win) => {
      win.localStorage.setItem('app_auth_token', 'cypress-fake-token');
      win.localStorage.setItem('ghostMemberUUID', 'cypress-user-001');
      win.localStorage.setItem('ghostMemberName', 'Cypress Tester');
    });

    // ** MOCK ALL BACKEND API CALLS **
    // This makes the test fast, reliable, and free to run.
    cy.intercept('POST', '/api/story/start', { statusCode: 201, body: { session_id: 'session-123', story: 'Initial story segment.', iteration: 1, is_complete: false, next_prompt_for_user: 'What happens next?' } }).as('startStory');
    cy.intercept('POST', '/api/story/continue', { statusCode: 200, body: { session_id: 'session-123', story: 'Continued story segment.', iteration: 2, is_complete: false, next_prompt_for_user: 'What happens next?' } }).as('continueStory');
    cy.intercept('POST', '/api/story/complete', { statusCode: 200, body: { session_id: 'session-123', full_story: 'This is the complete story.', iteration: 8, is_complete: true } }).as('completeStory');
    cy.intercept('POST', '/api/story/save', { statusCode: 200, body: { story_id: 'saved-story-456', message: 'Story saved successfully.' } }).as('saveStory');
    cy.intercept('POST', '/api/story/pdf/story', { statusCode: 200, body: 'fake-pdf-content', headers: { 'Content-Type': 'application/pdf' } }).as('generatePdf');
    cy.intercept('GET', '/api/story/user/stories', { statusCode: 200, body: [] }).as('getStories'); // Start with no stories
  });

  it('should guide a user through the entire multi-turn story process', function() {
    // Start at the root of our application
    cy.visit('/');

    // 1. INITIATE STORY (Turn 0)
    cy.get('textarea').type(`${this.storyData.initialPrompt.dialogue} ${this.storyData.initialPrompt.action}`);
    cy.get('[data-testid=start-story-button]').click();
    cy.wait('@startStory');
    cy.contains('Current Story Progress').should('be.visible');

    // 2. ADD TO THE STORY 6 TIMES (Turns 1-6)
    this.storyData.continuations.forEach((turn, index) => {
      cy.get('textarea').clear().type(turn.userInput);
      cy.get('[data-testid=continue-story-button]').click();
      cy.wait('@continueStory');
      cy.contains(turn.assertion).should('be.visible');
    });

    // 3. COMPLETE THE STORY
    cy.get('[data-testid=complete-story-button]').click();
    cy.wait('@completeStory');
    cy.contains(this.storyData.completion.assertion).should('be.visible');

    // 4. GENERATE A PDF
    cy.get('input#storyNameInput').type(this.storyData.storyName);
    cy.contains('button', 'Download as PDF').should('not.be.disabled').click();
    cy.wait('@generatePdf'); // Verify the API call was made

    // 5. SAVE THE STORY
    cy.contains('button', 'Save Story to Database').should('not.be.disabled').click();
    cy.wait('@saveStory');
    cy.contains(this.storyData.save.assertion).should('be.visible');

    // 6. RETRIEVE THE STORY
    // Mock the API call again, this time returning the story we just "saved"
    cy.intercept('GET', '/api/story/user/stories', {
        statusCode: 200,
        body: [{ story_id: 'saved-story-456', name: this.storyData.storyName, content: '...' }]
    }).as('getStoriesAfterSave');

    cy.contains('a', 'View My Saved Stories').click();
    cy.wait('@getStoriesAfterSave');
    cy.url().should('include', '/my-stories');
    cy.contains('h1', this.storyData.retrieve.assertion).should('be.visible');
    cy.contains(this.storyData.storyName).should('be.visible');
  });
});
