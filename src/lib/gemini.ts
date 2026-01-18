import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GENAI_API_KEY

if (!apiKey) {
  console.error('❌ GOOGLE_GENAI_API_KEY is not set in environment variables')
  throw new Error('GOOGLE_GENAI_API_KEY is not configured')
}

export const genAI = new GoogleGenerativeAI(apiKey)

// Content limits tuned for deep repo analysis with token optimization
export const CONTENT_LIMITS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_XML_SIZE: 300000, // 300KB - reduced but still comprehensive
  MAX_RESPONSE_LENGTH: 14000,
  MAX_CONTEXT_HISTORY: 6, // Reduced from 8 - only last 3 exchanges
  MAX_HISTORY_CHARS: 1000, // Max chars per message in history
};

// Get the Gemini model for text generation
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: 6000,
      temperature: 0.4,
      topP: 0.85,
      topK: 40,
    },
  })
}

// Get the embedding model for vector generation
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ model: 'embedding-001' })
}

/**
 * Response cache for identical questions (saves tokens on repeated queries)
 * Cache is in-memory and cleared on server restart
 */
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour cache

function getCacheKey(userMessage: string, projectXML: string | null): string {
  // Create a simple hash of question + XML size (not content to avoid huge keys)
  const xmlHash = projectXML ? `${projectXML.length}-${projectXML.substring(0, 100).replace(/\s/g, '')}` : 'no-xml';
  return `${userMessage.trim().toLowerCase()}-${xmlHash}`;
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create an optimized prompt for code analysis
 */
function createCodeAnalysisPrompt(
  userMessage: string,
  projectXML: string | null,
  chatHistory: Array<{content: string, role: string}> = []
): string {
  // Validate and process XML content
  let truncatedXML = '';
  let xmlInfo = 'No XML provided';
  
  if (projectXML && projectXML.trim().length > 0) {
    const cleanXML = projectXML.trim();
    console.log('📄 XML Processing:', {
      originalLength: projectXML.length,
      cleanedLength: cleanXML.length,
      isEmpty: cleanXML.length === 0,
      firstChars: cleanXML.substring(0, 100),
      lastChars: cleanXML.length > 100 ? cleanXML.substring(cleanXML.length - 100) : 'N/A'
    });
    
    if (cleanXML.length > CONTENT_LIMITS.MAX_XML_SIZE) {
      // Smart truncation: prioritize structure (first 40%), key files (middle 20%), and end (40%)
      const firstSize = Math.floor(CONTENT_LIMITS.MAX_XML_SIZE * 0.4);
      const middleSize = Math.floor(CONTENT_LIMITS.MAX_XML_SIZE * 0.2);
      const endSize = CONTENT_LIMITS.MAX_XML_SIZE - firstSize - middleSize;
      
      // Try to find important sections (package.json, README, main entry points)
      const importantPatterns = /<(file|directory)[^>]*path="[^"]*(package\.json|README|index\.(js|ts|tsx|py)|main\.(js|ts|tsx|py)|app\.(js|ts|tsx|py)|src\/[^"]*\.(js|ts|tsx|py))"/gi;
      const importantMatches = [...cleanXML.matchAll(importantPatterns)];
      
      let smartTruncated = cleanXML.substring(0, firstSize);
      
      // Include important files if found
      if (importantMatches.length > 0) {
        const importantStart = Math.max(0, importantMatches[0].index! - 1000);
        const importantEnd = Math.min(cleanXML.length, importantMatches[importantMatches.length - 1].index! + 5000);
        if (importantStart > firstSize && importantEnd < cleanXML.length - endSize) {
          smartTruncated += "\n\n... [important files] ...\n\n" + cleanXML.substring(importantStart, Math.min(importantStart + middleSize, importantEnd));
        }
      } else {
        smartTruncated += "\n\n... [middle content truncated] ...\n\n";
      }
      
      smartTruncated += cleanXML.substring(cleanXML.length - endSize);
      truncatedXML = smartTruncated;
      xmlInfo = `XML truncated (${cleanXML.length} chars → ${CONTENT_LIMITS.MAX_XML_SIZE} chars)`;
    } else {
      truncatedXML = cleanXML;
      xmlInfo = `Complete XML (${cleanXML.length} chars)`;
    }
    
    console.log('📄 Final XML Info:', xmlInfo);
  } else {
    console.log('⚠️ XML Processing: No valid XML content provided', {
      xmlProvided: !!projectXML,
      xmlLength: projectXML ? projectXML.length : 0,
      xmlType: typeof projectXML
    });
  }

  // Get recent conversation context
  const recentHistory = chatHistory
    .slice(-CONTENT_LIMITS.MAX_CONTEXT_HISTORY)
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');

  // Flexible system prompt - adapts to user questions, no rigid structure
  const systemPrompt = `You are a code analysis assistant. Answer the user's question directly and thoroughly, adapting your response structure to what they're asking. Always ground claims in file evidence using **path/file.ts** format. Use clear sections, short paragraphs (2-3 sentences), and bullet lists for identifiers when helpful.`;

  // Smart chat history - only include last 3-4 exchanges, summarize older ones
  let optimizedHistory = '';
  if (chatHistory.length > 0) {
    const recentExchanges = chatHistory.slice(-6); // Last 3 user-assistant pairs
    const olderMessages = chatHistory.slice(0, -6);
    
    if (olderMessages.length > 0) {
      // Summarize older messages if there are many
      optimizedHistory = `[Previous conversation summary: ${olderMessages.length} earlier messages]\n\n`;
    }
    
    optimizedHistory += recentExchanges
      .map(msg => `${msg.role === 'user' ? 'Q' : 'A'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`)
      .join('\n');
  }

  return `${systemPrompt}

**Repo XML:** ${truncatedXML && truncatedXML.trim().length > 0 ? truncatedXML : 'Not available'}

${optimizedHistory ? `**Recent:**\n${optimizedHistory}\n` : ''}**Q:** ${userMessage}

**A:**`;
}

/**
 * Call Gemini API with project context
 */
export async function generateGeminiResponse(
  userMessage: string,
  projectXML: string | null = null,
  chatHistory: Array<{content: string, role: string}> = []
): Promise<string> {
  try {
    // Validate input
    if (!userMessage || userMessage.trim().length === 0) {
      return "Please ask a specific question about your project.";
    }

    if (userMessage.length > CONTENT_LIMITS.MAX_MESSAGE_LENGTH) {
      return `Message too long. Please keep it under ${CONTENT_LIMITS.MAX_MESSAGE_LENGTH} characters.`;
    }

    // Check cache first (only for questions without chat history to avoid stale context)
    if (chatHistory.length === 0) {
      const cacheKey = getCacheKey(userMessage, projectXML);
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('💾 Using cached response (token savings!)');
        return cached.response;
      }
    }

    // Get the Gemini model
    const model = getGeminiModel();
    
    // Create the prompt
    const prompt = createCodeAnalysisPrompt(userMessage, projectXML, chatHistory);
    
    // Estimate and log token usage
    const estimatedTokens = estimateTokens(prompt);
    console.log('🤖 Sending request to Gemini API...', {
      estimatedInputTokens: estimatedTokens,
      xmlSize: projectXML?.length || 0,
      historyLength: chatHistory.length
    });
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Cache the response if no chat history (fresh questions)
    if (chatHistory.length === 0) {
      const cacheKey = getCacheKey(userMessage, projectXML);
      responseCache.set(cacheKey, { response: text, timestamp: Date.now() });
      console.log('💾 Response cached for future use');
    }

    // Log token usage
    const outputTokens = estimateTokens(text);
    console.log(`📤 Response: ${text.length} chars (~${outputTokens} tokens) | Total: ~${estimatedTokens + outputTokens} tokens`);
    
    if (text.length > CONTENT_LIMITS.MAX_RESPONSE_LENGTH) {
      console.warn(`⚠️ Response is long (${text.length} chars), but will not be truncated`);
    }

    console.log('✅ Gemini response generated successfully');
    return text;

  } catch (error) {
    console.error('❌ Gemini API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return "Configuration error: Invalid API key. Please check your Gemini API setup.";
      } else if (error.message.includes('quota')) {
        return "API quota exceeded. Please try again later.";
      } else if (error.message.includes('safety')) {
        return "Unable to process this request due to content safety policies.";
      }
    }

    return "I'm experiencing technical difficulties. Please try asking your question again.";
  }
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string | null, isSignedIn: boolean): boolean {
  const key = userId || 'anonymous';
  const limits = isSignedIn 
    ? { requests: 50, windowMs: 3600000 } // 50 per hour for signed-in users
    : { requests: 10, windowMs: 3600000 }; // 10 per hour for guests

  const now = Date.now();
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limits.windowMs });
    return true;
  }

  if (userLimit.count >= limits.requests) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Clear response cache (useful for testing or when repo changes)
 */
export function clearResponseCache(): void {
  responseCache.clear();
  console.log('🗑️ Response cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: number } {
  return {
    size: responseCache.size,
    entries: responseCache.size
  };
}