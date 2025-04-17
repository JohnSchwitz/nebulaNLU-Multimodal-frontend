// tests/helpers/index.ts
import { flushPromises } from '@vue/test-utils'

export const waitForResponse = async () => {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const mockAxiosResponse = (data: any) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {}
})