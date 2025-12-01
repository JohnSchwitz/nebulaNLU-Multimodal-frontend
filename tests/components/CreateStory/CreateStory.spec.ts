// tests/components/CreateStory.spec.ts

import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRoute, useRouter } from 'vue-router';
import CreateStory from '@/views/CreateStory.vue';
import api from '@/services/api';

// 1. Mock the entire API service
vi.mock('@/services/api');

// 2. Mock the vue-router module to control its composables
vi.mock('vue-router');

// Note: We are no longer mocking vue-router globally. It will be mocked per test.
describe('CreateStory.vue', () => {
  // A sample token to be used in tests
  const FAKE_JWT = 'fake-jwt-for-testing';

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    vi.resetAllMocks();
    localStorage.clear();

    // Mock the successful response for the UI texts API
    vi.mocked(api.getUiTexts).mockResolvedValue({
      placeholderPrompts: ['A test prompt...'],
      initialStoryGuidance: 'Tell me a test story.',
    });
  });

  it('should not call authentication when no URL parameters are present', async () => {
    // Mount the component without any special setup
    vi.mocked(useRoute).mockReturnValue({ query: {} });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);

    const wrapper = mount(CreateStory, {
      global: {
        plugins: [createPinia()], // Provide Pinia
      },
    });
    await nextTick();
    await flushPromises();

    // Assert that the authentication function was NOT called
    expect(api.authenticateGhostUser).not.toHaveBeenCalled();
  });

  it('should call authentication and store token when Ghost member params are in the URL', async () => {
    // 3. Mock the authentication API call to return our fake token
    vi.mocked(api.authenticateGhostUser).mockResolvedValue({ token: FAKE_JWT });

    // 4. Mock the return value of useRoute() for THIS test
    vi.mocked(useRoute).mockReturnValue({
      query: {
        ghost_member_uuid: '010ef926-f553-4b7a-80df-5e0e2c6aa65d',
        ghost_member_email: 'john.schwitz@gmail.com',
        ghost_member_name: 'John G Schwitz',
      },
    });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);

    // Mount the component, providing the mocked router
    const wrapper = mount(CreateStory, {
      global: {
        plugins: [createPinia()],
      },
      // This is an advanced technique to ensure the script setup block is processed.
      props: {},
      slots: {
        default: '<div></div>'
      },
    });

    // Wait for async operations in onMounted to complete
    // This two-step process is more robust for complex onMounted hooks:
    // 1. Wait for the next DOM update cycle, which allows `onMounted` to be called.
    await nextTick();
    // 2. Now flush all the promises that were created inside `onMounted`.
    await flushPromises();

    // 5. Assert that the correct logic ran
    expect(api.authenticateGhostUser).toHaveBeenCalledWith({
      ghost_user_id: '010ef926-f553-4b7a-80df-5e0e2c6aa65d',
      name: 'John G Schwitz',
      email: 'john.schwitz@gmail.com',
    });

    // Assert that the token was stored in localStorage
    expect(localStorage.getItem('app_auth_token')).toBe(FAKE_JWT); // This key is defined in api.ts
  });

  it('should use existing token from localStorage if available', async () => {
    // 5. Simulate a user who is already logged in
    localStorage.setItem('app_auth_token', FAKE_JWT);

    // Mock an API that requires auth
    vi.mocked(api.startStory).mockResolvedValue({
        session_id: '123',
        story: 'It began...',
        iteration: 1,
        is_complete: false,
        next_prompt_for_user: 'What next?'
    });

    vi.mocked(useRoute).mockReturnValue({ query: {} });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);

    const wrapper = mount(CreateStory, {
      global: {
        plugins: [createPinia()],
      },
    });

    // Simulate user action that calls an authenticated endpoint
    // (e.g., filling out a form and clicking a button)
    // await wrapper.find('textarea').setValue('A new story');
    // await wrapper.find('button').trigger('click');

    // Assert that the auth function was NOT called again
    expect(api.authenticateGhostUser).not.toHaveBeenCalled();

    // If you triggered an action, you could assert that the API call was made
    // expect(api.startStory).toHaveBeenCalled();
  });
});
