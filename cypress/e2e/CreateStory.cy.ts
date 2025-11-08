describe('Full Story Creation Flow', () => {
  // This block runs before the test begins.
  beforeEach(() => {
    // Load the test data from our fixture file
    cy.fixture('story_flow.json').as('storyData');

    // ** BYPASS AUTHENTICATION **
    // We set the localStorage items to trick the app into thinking we are logged in.
    cy.window().then((win) => {
      win.localStorage.setItem('app_auth_token', 'cypress-fake-token');
      win.localStorage.setItem('ghostMemberUUID', 'cypress-user-001');
      win.localStorage.setItem('ghostMemberName', 'Cypress Tester');
    });

    // We also need to mock the backend API calls to make the test fast and reliable.
    // This tells Cypress to intercept API calls and return fake data.
    cy.intercept('POST', '/api/story/start', {
      statusCode: 201,
      body: {
        session_id: 'session-123',
        story: 'A brave knight discovered a mysterious, glowing cave.',
        iteration: 1,
        is_complete: false,
        next_prompt_for_user: 'What happens next?'
      }
    }).as('startStory');

    cy.intercept('POST', '/api/story/continue', {
      statusCode: 200,
      body: {
        session_id: 'session-123',
        story: 'The story continues...', // A generic response is fine for the test
        iteration: 2, // In a real test, you'd increment this
        is_complete: false,
        next_prompt_for_user: 'What happens next?'
      }
    }).as('continueStory');

    cy.intercept('POST', '/api/story/complete', {
      statusCode: 200,
      body: {
        session_id: 'session-123',
        full_story: 'This is the complete story text.',
        iteration: 8,
        is_complete: true
      }
    }).as('completeStory');

    cy.intercept('POST', '/api/story/save', {
      statusCode: 200,
      body: { story_id: 'saved-story-456', message: 'Story saved successfully.' }
    }).as('saveStory');
  });

  it('should allow a user to create, continue, complete, save, and download a story', function() {
    // The `function()` syntax allows us to use `this.storyData` from the alias.

    // Start at the root of our application
    cy.visit('/');

    // 1. INITIATE STORY
    cy.get('textarea').type(this.storyData.initialPrompt);
    cy.get('[data-testid=start-story-button]').click();
    cy.wait('@startStory'); // Wait for the API call to finish
    cy.contains('Current Story Progress').should('be.visible');
    cy.contains(this.storyData.initialPrompt).should('be.visible');

    // 2. ADD TO THE STORY 6 TIMES
    for (let i = 0; i < 6; i++) {
      cy.get('textarea').clear().type(this.storyData.continuations[i]);
      cy.get('[data-testid=continue-story-button]').click();
      cy.wait('@continueStory');
      // Add a small assertion to make sure the UI updates
      cy.contains(`Your turn to provide input for Story Turn ${i + 2}`).should('be.visible');
    }

    // 3. COMPLETE THE STORY
    cy.get('[data-testid=complete-story-button]').click();
    cy.wait('@completeStory');
    cy.contains('This story is now complete!').should('be.visible');

    // 4. GENERATE A PDF
    // For PDF, we can't easily check the download content, but we can ensure
    // the button is clickable and an API call would be made.
    cy.get('input#storyNameInput').type(this.storyData.storyName);
    cy.contains('button', 'Download as PDF').should('not.be.disabled').click();
    // In a real scenario, you might mock the PDF endpoint as well.

    // 5. SAVE THE STORY
    cy.contains('button', 'Save Story to Database').should('not.be.disabled').click();
    cy.wait('@saveStory');
    cy.contains('Success').should('be.visible');
    cy.contains('Story saved successfully.').should('be.visible');

    // 6. RETRIEVE THE STORY
    // We can simulate this by navigating to the "My Stories" page and checking
    // if the story name appears.
    cy.intercept('GET', '/api/story/user/stories', {
        statusCode: 200,
        body: [{ story_id: 'saved-story-456', name: this.storyData.storyName, content: '...' }]
    }).as('getStories');

    cy.contains('a', 'View My Saved Stories').click();
    cy.wait('@getStories');
    cy.url().should('include', '/my-stories'); // Assuming this is the route
    cy.contains('h1', 'My Saved Stories').should('be.visible');
    cy.contains(this.storyData.storyName).should('be.visible');
  });
});
