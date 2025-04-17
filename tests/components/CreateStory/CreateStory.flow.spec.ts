import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateStory from '@/views/CreateStory.vue'
import api from '@/services/api'

vi.mock('@/services/api')

describe('CreateStory User Flows', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(CreateStory, {
      global: {
        stubs: ['router-link']
      }
    })
  })

  it('completes full story creation flow', async () => {
    // Setup mocks
    vi.mocked(api.generateStory).mockResolvedValueOnce('Generated story')
    vi.mocked(api.completeStory).mockResolvedValueOnce('Completed story')

    // Input story
    wrapper.vm.storyTellerInput = 'Test input'
    await wrapper.vm.generateStory()
    await flushPromises()

    // Complete story
    await wrapper.vm.completeStory()
    await flushPromises()

    // Set story name and upload
    wrapper.vm.storyName = 'Test Story'
    await wrapper.vm.uploadToDatabase()
    await flushPromises()

    expect(wrapper.vm.error).toBeFalsy()
  })
})