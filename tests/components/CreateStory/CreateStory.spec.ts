// tests/components/CreateStory.spec.ts

import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import CreateStory from '@/views/CreateStory.vue';
import api from '@/services/api';

// Mock the entire API service
vi.mock('@/services/api');

describe('CreateStory.vue', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia());

    // Get the actual auth store instance
    authStore = useAuthStore();

    // Reset mocks and localStorage
    vi.clearAllMocks();
    localStorage.clear();

    // Mock the UI texts API (called on mount)
    vi.mocked(api.getUiTexts).mockResolvedValue({
      placeholderPrompts: ['A test prompt...'],
      initialStoryGuidance: 'Tell me a test story for {{name}}.',
    });
  });

  it('should display authentication prompt when user is not authenticated', async () => {
    // ARRANGE: User is not authenticated (default state)
    const wrapper = mount(CreateStory);
    await flushPromises();

    // ASSERT: Should show login prompt
    expect(wrapper.text()).toContain('Please log in via Ghost');
  });

  it('should display welcome message when user is authenticated', async () => {
    // ARRANGE: Set authenticated user
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
    authStore.authToken = 'fake-jwt-token';
    localStorage.setItem('app_auth_token', 'fake-jwt-token');

    const wrapper = mount(CreateStory);
    await flushPromises();

    // ASSERT: Should show welcome message with user name
    expect(wrapper.text()).toContain('Hello Test User!');
    expect(wrapper.text()).toContain('Let\'s Begin!');
  });

  it('should start a new story when user submits initial prompt', async () => {
    // ARRANGE: Authenticated user
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
    authStore.authToken = 'fake-jwt-token';
    localStorage.setItem('app_auth_token', 'fake-jwt-token');

    // Mock the startStory API
    vi.mocked(api.startStory).mockResolvedValue({
      session_id: 'session-123',
      story: 'Once upon a time in a magical kingdom...',
      iteration: 1,
      is_complete: false,
      next_prompt_for_user: 'What was the name of the kingdom?',
    });

    const wrapper = mount(CreateStory);
    await flushPromises();

    // ACT: Enter prompt and click start button
    const textarea = wrapper.find('textarea#story-teller-input');
    await textarea.setValue('Tell me a story about a magical kingdom');

    const startButton = wrapper.find('[data-testid="start-story-button"]');
    await startButton.trigger('click');
    await flushPromises();

    // ASSERT: API was called correctly
    expect(api.startStory).toHaveBeenCalledWith({
      initial_prompt: 'Tell me a story about a magical kingdom',
    });

    // Story content should be displayed
    expect(wrapper.text()).toContain('Once upon a time in a magical kingdom...');

    // Next prompt suggestion should be shown
    expect(wrapper.text()).toContain('What was the name of the kingdom?');
  });

  it('should continue story when user provides feedback', async () => {
    // ARRANGE: Authenticated user with existing session
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
    authStore.authToken = 'fake-jwt-token';
    localStorage.setItem('app_auth_token', 'fake-jwt-token');

    // Mock startStory for initial story
    vi.mocked(api.startStory).mockResolvedValue({
      session_id: 'session-123',
      story: 'Once upon a time...',
      iteration: 1,
      is_complete: false,
      next_prompt_for_user: 'What happens next?',
    });

    // Mock continueStory for continuation
    vi.mocked(api.continueStory).mockResolvedValue({
      session_id: 'session-123',
      story: 'The brave knight drew his sword...',
      iteration: 2,
      is_complete: false,
      next_prompt_for_user: 'Who was the knight fighting?',
    });

    const wrapper = mount(CreateStory);
    await flushPromises();

    // Start initial story
    await wrapper.find('textarea#story-teller-input').setValue('Tell me a story');
    await wrapper.find('[data-testid="start-story-button"]').trigger('click');
    await flushPromises();

    // ACT: Continue the story
    await wrapper.find('textarea#story-teller-input').setValue('A knight appeared');
    await wrapper.find('[data-testid="continue-story-button"]').trigger('click');
    await flushPromises();

    // ASSERT: continueStory API was called
    expect(api.continueStory).toHaveBeenCalledWith({
      session_id: 'session-123',
      feedback: 'A knight appeared',
    });

    // Both story parts should be visible
    expect(wrapper.text()).toContain('Once upon a time...');
    expect(wrapper.text()).toContain('The brave knight drew his sword...');
  });

  it('should complete story and enable save options', async () => {
    // ARRANGE: Authenticated user with existing session
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
    authStore.authToken = 'fake-jwt-token';
    localStorage.setItem('app_auth_token', 'fake-jwt-token');

    // Mock startStory
    vi.mocked(api.startStory).mockResolvedValue({
      session_id: 'session-123',
      story: 'Once upon a time...',
      iteration: 1,
      is_complete: false,
      next_prompt_for_user: 'Continue?',
    });

    // Mock completeStory
    vi.mocked(api.completeStory).mockResolvedValue({
      session_id: 'session-123',
      full_story: 'Once upon a time... And they lived happily ever after. The End.',
      iteration: 2,
      is_complete: true,
    });

    const wrapper = mount(CreateStory);
    await flushPromises();

    // Start story
    await wrapper.find('textarea#story-teller-input').setValue('Tell me a story');
    await wrapper.find('[data-testid="start-story-button"]').trigger('click');
    await flushPromises();

    // ACT: Complete the story
    await wrapper.find('[data-testid="complete-story-button"]').trigger('click');
    await flushPromises();

    // ASSERT: completeStory API was called
    expect(api.completeStory).toHaveBeenCalledWith({
      session_id: 'session-123',
    });

    // Completion message should be shown
    expect(wrapper.text()).toContain('Story Complete');

    // Save section should be visible
    expect(wrapper.text()).toContain('Save Your Masterpiece');
    expect(wrapper.find('input#storyNameInput').exists()).toBe(true);
  });

  it('should display error message when story generation fails', async () => {
    // ARRANGE: Authenticated user
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
    authStore.authToken = 'fake-jwt-token';
    localStorage.setItem('app_auth_token', 'fake-jwt-token');

    // Mock API to reject with error
    const apiError = new Error('Network connection failed');
    vi.mocked(api.startStory).mockRejectedValue(apiError);

    const wrapper = mount(CreateStory);
    await flushPromises();

    // ACT: Try to start story
    await wrapper.find('textarea#story-teller-input').setValue('Tell me a story');
    await wrapper.find('[data-testid="start-story-button"]').trigger('click');
    await flushPromises();

    // ASSERT: Error message is displayed
    expect(wrapper.text()).toContain('Story Generation Error');
    expect(wrapper.text()).toContain('Network connection failed');
  });
});
