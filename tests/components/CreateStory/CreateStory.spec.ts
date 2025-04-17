import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CreateStory from '@/views/CreateStory.vue'
import api from '@/services/api'

vi.mock('@/services/api')

describe('CreateStory.vue', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(CreateStory, {
      global: {
        stubs: ['router-link']
      }
    })
  })

  it('enables ScrollBox editing after Complete Story', async () => {
    const mockStory = 'Completed story content'
    vi.mocked(api.completeStory).mockResolvedValueOnce(mockStory)

    await wrapper.vm.completeStory()
    await flushPromises()

    expect(wrapper.vm.isScrollBoxEditable).toBe(true)
    expect(wrapper.vm.storyContent).toBe(mockStory)
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(api.completeStory).mockRejectedValueOnce(new Error('Failed to complete story'))

    await wrapper.vm.completeStory()
    await flushPromises()

    expect(wrapper.vm.error).toBe('Failed to complete story')
  })
})