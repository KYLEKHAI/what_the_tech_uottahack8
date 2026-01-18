/**
 * Claude API integration via OpenRouter
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY is not set in environment variables");
  throw new Error("OPENROUTER_API_KEY is not configured");
}

export const CONTENT_LIMITS = {
  MAX_MESSAGE_LENGTH: 200000, // Claude can handle much larger inputs
  MAX_XML_SIZE: 500000, // 500KB - Claude handles large contexts better
  MAX_RESPONSE_LENGTH: 100000, // Claude can generate very long responses
  MAX_CONTEXT_HISTORY: 10,
};

/**
 * Generate response using Claude 4 via OpenRouter
 */
export async function generateClaudeResponse(
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

    // Prepare the system prompt with project context
    let systemPrompt = `You are a Senior Software Architect and Technical Strategist. Your goal is to provide comprehensive, accurate analysis of codebases and generate high-quality Mermaid diagrams.

**Core Objective:** Analyze code structures intelligently and generate precise, project-specific diagrams that reflect real architecture patterns, data flows, and business logic.

**Guidelines:**
- Focus on actual code patterns and relationships, not generic templates
- Use meaningful component names from the actual codebase  
- Generate clean, readable Mermaid syntax
- Consider scalability, maintainability, and architectural best practices
- Identify real business processes and data transformations`;

    if (projectXML) {
      systemPrompt += `\n\n**Project Context:** The following XML contains the complete project structure and code:\n\n${projectXML.slice(0, CONTENT_LIMITS.MAX_XML_SIZE)}`;
    }

    // Prepare conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory.slice(-CONTENT_LIMITS.MAX_CONTEXT_HISTORY).map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    console.log("🤖 Calling Claude 4 via OpenRouter...");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://what-the-tech.app", // Optional: for OpenRouter analytics
        "X-Title": "What The Tech - Architecture Analyzer" // Optional: for OpenRouter analytics
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet", // Using Claude 3.5 Sonnet (most capable Claude model available)
        messages: messages,
        max_tokens: 8000,
        temperature: 0.3, // Lower temperature for more focused, technical responses
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 401) {
        return "Authentication failed with OpenRouter. Please check API key configuration.";
      } else if (response.status === 429) {
        return "Rate limit exceeded. Please try again in a moment.";
      } else if (response.status >= 500) {
        return "OpenRouter service temporarily unavailable. Please try again later.";
      } else {
        return `OpenRouter API error: ${response.statusText}`;
      }
    }

    const data = await response.json();
    
    if (data.choices && data.choices.length > 0) {
      const result = data.choices[0].message.content.trim();
      
      console.log("✅ Claude response received:", {
        length: result.length,
        model: data.model,
        usage: data.usage
      });
      
      return result;
    } else {
      console.error("No response choices from Claude:", data);
      return "No response generated. Please try again.";
    }

  } catch (error) {
    console.error("Exception calling Claude:", error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return "Network error connecting to Claude. Please check your internet connection.";
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
    ? { requests: 100, windowMs: 3600000 } // 100 per hour for signed-in users (Claude is more capable)
    : { requests: 20, windowMs: 3600000 }; // 20 per hour for guests

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
 * Get cost estimate for Claude usage (OpenRouter pricing)
 */
export function getClaudeCostEstimate(inputTokens: number, outputTokens: number): number {
  // Claude 3.5 Sonnet pricing via OpenRouter (approximate)
  const inputCostPer1K = 0.003; // $3 per 1M tokens
  const outputCostPer1K = 0.015; // $15 per 1M tokens
  
  const inputCost = (inputTokens / 1000) * inputCostPer1K;
  const outputCost = (outputTokens / 1000) * outputCostPer1K;
  
  return inputCost + outputCost;
}