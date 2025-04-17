// tests/gemini.real.spec.ts
import { describe, it, expect } from 'vitest'

describe('Gemini API Real Test', () => {
  it('should get a real response from Gemini', async () => {
    try {
      const response = await fetch('http://localhost:5000/create_story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: 1,  // Required field
          initial_prompt: "Write a one-sentence test story."  // Required field
        })
      })

      // Log raw response for debugging
      const text = await response.text()
      console.log('Raw response:', text)
      
      // Parse response if we have content
      const data = text ? JSON.parse(text) : null
      console.log('Parsed data:', data)

      expect(response.ok).toBe(true)
      expect(data).toBeDefined()
      expect(data.story).toBeDefined()
      expect(typeof data.story).toBe('string')
    } catch (error) {
      console.error('Test Error:', error)
      throw error
    }
  }, 10000)
})