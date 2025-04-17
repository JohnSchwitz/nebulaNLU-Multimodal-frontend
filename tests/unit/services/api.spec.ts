// tests/unit/services/api.spec.ts
import { describe, it, expect } from 'vitest'

const API_URL = 'http://127.0.0.1:5000'  // Add this back

describe('Story Storage', () => {
    let savedStoryId: number

    it('should save a story to database', async () => {
      const response = await fetch(`${API_URL}/save_story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: 1,
          story_name: "Test Story",
          story_content: "Test story content"
        })
      })

      const data = await response.json()
      console.log('Save response:', data)
      expect(response.ok).toBe(true)
      expect(data.story_id).toBeDefined()
      savedStoryId = data.story_id
    })

    it('should retrieve user stories', async () => {
      const response = await fetch(`${API_URL}/get_stories?user_id=1`)
      const data = await response.json()
      console.log('Get stories response:', data)
      
      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      
      // Update to match the array format from the server
      const savedStory = data.find(story => story[0] === savedStoryId)  // story[0] is story_id
      expect(savedStory).toBeDefined()
      expect(savedStory[1]).toBeDefined()  // story name
      expect(savedStory[2]).toBeDefined()  // story content
    })
})