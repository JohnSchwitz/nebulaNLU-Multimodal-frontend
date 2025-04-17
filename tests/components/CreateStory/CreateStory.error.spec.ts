// tests/components/CreateStory/CreateStory.error.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateStory from '@/views/CreateStory.vue'
import axios from 'axios'

vi.mock('axios')

describe('CreateStory Error Handling', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(CreateStory, {
      global: {
        stubs: ['router-link']
      }
    })
  })

  it('handles network errors', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Network Error'))

    await wrapper.vm.generateStory()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Failed to generate story. Please try again.')
  })

  it('handles invalid story name', async () => {
    wrapper.vm.storyName = ''
    await wrapper.vm.uploadToDatabase()
    expect(wrapper.vm.error).toContain('title')
  })

  it('handles database errors', async () => {
    wrapper.vm.isStoryCompleted = true
    wrapper.vm.storyName = 'Test'
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Database Error'))

    await wrapper.vm.uploadToDatabase()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Failed to save story')
  })
})