import { afterEach, vi } from 'vitest';

// This automatically mocks the entire api service for every test file.
vi.mock('@/services/api');

// Mock the vue-router to prevent errors in components that use it.
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ query: {} })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// This ensures that our mocks are reset between each test.
afterEach(() => {
  vi.clearAllMocks();
});
