import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock vue-router
config.global.mocks = {
  $router: {
    push: vi.fn()
  }
}

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks()
})