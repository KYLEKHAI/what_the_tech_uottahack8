import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GENAI_API_KEY!

export const genAI = new GoogleGenerativeAI(apiKey)

// Get the Gemini Pro model for text generation
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ model: 'gemini-pro' })
}

// Get the embedding model for vector generation
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ model: 'embedding-001' })
}