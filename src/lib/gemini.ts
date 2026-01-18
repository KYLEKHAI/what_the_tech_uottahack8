import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_GENAI_API_KEY

if (!apiKey) {
  console.error('❌ GOOGLE_GENAI_API_KEY is not set in environment variables')
  throw new Error('GOOGLE_GENAI_API_KEY is not configured')
}

export const genAI = new GoogleGenerativeAI(apiKey)

// Content limits and safety settings
export const CONTENT_LIMITS = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_XML_SIZE: 150000, // 150KB - increased for larger projects
  MAX_RESPONSE_LENGTH: 8000, // Significantly increased for comprehensive responses
  MAX_CONTEXT_HISTORY: 5,
};

// Get the Gemini Pro model for text generation
export const getGeminiModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash', // Updated to current model name
    generationConfig: {
      maxOutputTokens: 2500, // Significantly increased for longer responses
      temperature: 0.7,
    },
  })
}

// Get the embedding model for vector generation
export const getEmbeddingModel = () => {
  return genAI.getGenerativeModel({ model: 'embedding-001' })
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
      // For large XML, include both beginning and end
      const halfSize = Math.floor(CONTENT_LIMITS.MAX_XML_SIZE / 2);
      truncatedXML = cleanXML.substring(0, halfSize) + 
                     "\n\n... [middle content truncated] ...\n\n" + 
                     cleanXML.substring(cleanXML.length - halfSize);
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

  return `You are a Senior Principal Software Architect and Technical Strategist. Your goal is to provide a comprehensive, 360-degree analysis of the provided codebase. You represent the "Source of Truth" for this repository.

**Core Objective:** Help me understand the "Why" behind the code, not just the "What." Focus on architectural patterns, data flow, design philosophy, and organizational structure.

**Analytical Framework:** When I ask questions, use the following lenses to provide your answers:

1. **High-Level Architecture:** Identify the primary design patterns (e.g., Microservices, Monolith, Event-Driven, Layered Architecture).
2. **Domain Logic:** Explain the core business problems this repository is solving and how the code maps to those problems.
3. **Data Lifecycle:** Trace how data enters the system, where it is transformed, and where it is persisted.
4. **Dependency Graph:** Analyze how different modules or services rely on one another and identify the "heart" of the codebase.
5. **Technical Debt & Design Choices:** Identify unique or non-standard implementations and infer why the original authors might have chosen them.

**Operational Guidelines:**
• **No Surface-Level Answers:** Do not just summarize file names. Explain the *intent* of the code.
• **File Referencing:** Always point to specific directories or files to ground your analysis in reality.
• **Visual Mapping:** When explaining complex flows, use text-based diagrams (like Mermaid syntax or clear bullet hierarchies) to visualize the structure.
• **Be Proactive:** If I ask about a specific feature, mention how it relates to the broader system context.

**Response Format:**
• Start with a brief "Context Synthesis" to show you understand the scope.
• Use bold headings for different sections of your analysis.
• Conclude with "Deep Dive Suggestions"—3 follow-up questions I should ask to understand the repo even better.

ANALYSIS CONTEXT:
${truncatedXML && truncatedXML.trim().length > 0 ? `
Complete Project Repository Structure and Content (${xmlInfo}):
\`\`\`xml
${truncatedXML}
\`\`\`

**CRITICAL ANALYSIS REQUIREMENTS:**
🔍 **ANALYZE THE ENTIRE XML STRUCTURE** - Don't just focus on README.md
- Examine ALL files, directories, and code content in the XML
- Look at source code, configuration files, package.json, dependencies
- Identify the technology stack from actual file extensions and imports
- Analyze the folder structure and architectural patterns
- Reference specific functions, classes, components, and modules found in the code
- Explain how different files and components work together
- Describe the build process, dependencies, and project setup based on config files
- Provide architectural insights based on the actual codebase structure
` : `⚠️ **PROJECT STRUCTURE NOT AVAILABLE** ⚠️

**Possible reasons:**
- The project hasn't been properly ingested/analyzed yet
- XML generation failed or is still in progress  
- You're viewing as a guest user without project access
- There was an error loading the project structure from storage

**Available assistance:**
- I can provide general programming and architectural guidance
- Ask me to help with specific development concepts or patterns
- Once the project structure is available, I can provide detailed analysis

**Recommendation:** Try re-ingesting the project or check if you have proper access permissions.
`}

${recentHistory ? `
**Recent Conversation Context:**
${recentHistory}
` : ''}

**USER QUESTION:** ${userMessage}

Provide a comprehensive architectural analysis based on the COMPLETE project structure and code content available in the XML.`;
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

    // Get the Gemini model
    const model = getGeminiModel();
    
    // Create the prompt
    const prompt = createCodeAnalysisPrompt(userMessage, projectXML, chatHistory);
    
    console.log('🤖 Sending request to Gemini API...');
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Log response length but don't truncate - let the full response come through
    console.log(`📤 Gemini response length: ${text.length} characters`);
    
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