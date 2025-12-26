// tests/components/CreateStory/CreateStory.spec.ts

import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import CreateStory from '@/views/CreateStory.vue';
import api from '@/services/api';

// --- 1. MOCK API SERVICE ---
vi.mock('@/services/api');

describe('CreateStory.vue', () => {
  let authStore: ReturnType<typeof useAuthStore>;

  const setupAuthenticatedUser = () => {
    authStore.authToken = 'fake-jwt-token';
    authStore.userId = 'test-user-id';
    authStore.userName = 'Test User';
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    vi.clearAllMocks();

    // Default Happy Path Mocks
    vi.mocked(api.getUiTexts).mockResolvedValue({
      placeholderPrompts: ['A test prompt...'],
      initialStoryGuidance: 'Tell me a test story for {{name}}.',
    });

    vi.mocked(api.getAccountInfo).mockResolvedValue({
      user_id: 'test-user-id',
      story_count: 5,
      story_limit: 10,
      stories_remaining: 5,
      subscription_type: 'free',
      can_create_story: true
    });

    vi.mocked(api.getSurveyStatus).mockResolvedValue({
      has_submitted: false,
      should_show_survey: false,
      completed_stories_count: 5,
      last_submitted_at: null
    });
  });

  // --- MOUNT HELPER WITH STUBS ---
  const mountComponent = () => {
    return mount(CreateStory, {
      global: {
        stubs: {
          // We stub these so we don't have to test their internal logic here
          SurveyModal: { template: '<div data-testid="survey-modal-stub" />' },
          SurveyBanner: { template: '<div data-testid="survey-banner-stub" />' }
        }
      }
    });
  };

  // --- TESTS ---

  it('should display authentication prompt when user is not authenticated', async () => {
    authStore.authToken = null;
    const wrapper = mountComponent();
    await flushPromises();
    expect(wrapper.text()).toContain('Please log in via Ghost');
  });

  it('should fetch account info and display credits when authenticated', async () => {
    setupAuthenticatedUser();
    const wrapper = mountComponent();
    await flushPromises();
    expect(api.getAccountInfo).toHaveBeenCalled();
    // Regex matches "Stories Remaining: 5 / 10" ignoring spans/whitespace
    expect(wrapper.text()).toMatch(/Stories Remaining:.*5.*\/.*10/);
  });

  it('should start a new story and decrement local credit count', async () => {
    setupAuthenticatedUser();

    vi.mocked(api.startStory).mockResolvedValue({
      session_id: 'session-123',
      story: 'Once upon a time...',
      iteration: 1,
      is_complete: false,
      next_prompt_for_user: 'What happens next?',
    });

    const wrapper = mountComponent();
    await flushPromises();

    // 1. Enter Valid Prompt (>10 chars)
    const textarea = wrapper.find('textarea#story-teller-input');
    await textarea.setValue('A magic dragon story that is long enough');

    // 2. Click Start
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Adventure'));
    if (!startBtn) throw new Error('Start button not found');
    await startBtn.trigger('click');
    await flushPromises();

    // 3. Verify
    expect(api.startStory).toHaveBeenCalledWith({ initial_prompt: 'A magic dragon story that is long enough' });
    expect(wrapper.text()).toContain('Once upon a time...');
    // Optimistic UI check (5 -> 4)
    expect(wrapper.text()).toMatch(/Stories Remaining:.*4.*\/.*10/);
  });

  it('should block story creation if user has 0 credits', async () => {
    setupAuthenticatedUser();

    // Mock 0 Credits
    vi.mocked(api.getAccountInfo).mockResolvedValue({
      user_id: 'test-user-id',
      story_count: 10,
      story_limit: 10,
      stories_remaining: 0,
      subscription_type: 'free',
      can_create_story: false
    });

    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Story Limit Reached');

    // Ensure button is disabled
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Adventure'));
    if (startBtn) {
      expect(startBtn.element.disabled).toBe(true);
    }
  });

  it('should complete story and trigger survey modal if eligible', async () => {
    setupAuthenticatedUser();

    // Mock the flow
    vi.mocked(api.startStory).mockResolvedValue({
      session_id: 'sess-1', story: 'Start', iteration: 1, is_complete: false
    });
    vi.mocked(api.completeStory).mockResolvedValue({
      session_id: 'sess-1', full_story: 'The End', iteration: 2, is_complete: true
    });
    // Mock Survey Trigger
    vi.mocked(api.getSurveyStatus).mockResolvedValue({
      has_submitted: false, should_show_survey: true, completed_stories_count: 3
    });

    const wrapper = mountComponent();
    await flushPromises();

    // 1. Start Story
    await wrapper.find('textarea').setValue('Start a valid story here');
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Adventure'));
    await startBtn?.trigger('click');
    await flushPromises();

    // 2. Wait for UI to switch to "Finish Story"
    expect(wrapper.text()).toContain('Finish Story');

    // 3. Finish Story
    const finishBtn = wrapper.findAll('button').find(b => b.text().includes('Finish Story'));
    await finishBtn?.trigger('click');
    await flushPromises();

    // 4. Assert
    expect(api.completeStory).toHaveBeenCalled();
    // Check if Survey Modal stub is rendered
    expect(wrapper.find('[data-testid="survey-modal-stub"]').exists()).toBe(true);
  });
});
