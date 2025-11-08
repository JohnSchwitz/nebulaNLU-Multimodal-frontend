import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

// Import the component to ensure it's importable by the test runner
import CreateStory from '@/views/CreateStory.vue';

describe('CreateStory.vue', () => {

  it('should be importable without errors', () => {
    // This is a "smoke test". Its only job is to ensure that the component
    // file itself can be loaded by the test environment without crashing.
    // If this test passes, it means your Vitest config, paths, and the
    // component's <script> section are syntactically correct.
    expect(CreateStory).toBeDefined();
  });

  it('is a basic truthy test to confirm the test runner is working', () => {
    // This test has no dependencies and simply verifies that the test
    // runner itself is executing assertions correctly.
    expect(true).toBe(true);
  });

  it('should render a generate button', () => {
    // Mount the component to a virtual DOM
    const wrapper = mount(CreateStory);

    // Find the button and check that it exists
    const button = wrapper.find('button');
    expect(button.exists()).toBe(true);
  });
});
