import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock router-link globally for all tests
config.global.stubs = {
  'router-link': {
    template: '<a><slot /></a>'
  }
}

// Auto-restore all mocks after each test
afterEach(() => {
  vi.restoreAllMocks()
})
