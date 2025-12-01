import { afterEach, vi } from 'vitest';

// This automatically mocks the entire api service for every test file.
vi.mock('@/services/api');

// This ensures that our mocks are reset between each test.
afterEach(() => {
  vi.clearAllMocks();
});
