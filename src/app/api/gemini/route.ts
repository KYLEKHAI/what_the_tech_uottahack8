import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiResponse, checkRateLimit } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  console.log('🔥 POST /api/gemini called');
  
  try {
    const body = await request.json();
    const { message, projectXML, chatHistory, userId, isSignedIn } = body;
    
    console.log('📦 Request body:', { 
      hasMessage: !!message, 
      hasProjectXML: !!projectXML && projectXML.length,
      xmlLength: projectXML ? projectXML.length : 0,
      chatHistoryLength: chatHistory?.length || 0,
      userId: userId || 'anonymous',
      isSignedIn: !!isSignedIn
    });

    // Validate required fields
    if (!message || message.trim().length === 0) {
      console.warn('⚠️ Empty message received');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check rate limits
    const rateLimitPassed = checkRateLimit(userId, !!isSignedIn);
    if (!rateLimitPassed) {
      console.log('⚠️ Rate limit exceeded for user:', userId || 'anonymous');
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    console.log('🤖 Generating Gemini response...');
    console.log(`📝 User message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    
    // Enhanced XML content validation and logging
    if (projectXML && projectXML.trim().length > 0) {
      const cleanXML = projectXML.trim();
      console.log(`📄 Project XML Status: VALID`);
      console.log(`📄 XML Length: ${cleanXML.length} characters`);
      console.log(`📄 XML Preview (first 200 chars): "${cleanXML.substring(0, 200)}${cleanXML.length > 200 ? '...' : ''}"`);
      
      // Check if XML contains actual content or just whitespace/minimal data
      if (cleanXML.length < 50) {
        console.warn('⚠️ XML seems very small, might be incomplete');
      }
      
      // Check for common XML structure indicators
      const hasXMLStructure = cleanXML.includes('<') && cleanXML.includes('>');
      const hasProjectContent = cleanXML.toLowerCase().includes('file') || 
                               cleanXML.toLowerCase().includes('directory') ||
                               cleanXML.toLowerCase().includes('package');
      
      console.log(`📄 XML Structure Check: hasXML=${hasXMLStructure}, hasContent=${hasProjectContent}`);
    } else {
      console.log('⚠️ Project XML Status: MISSING OR EMPTY');
      console.log('⚠️ XML Details:', {
        provided: !!projectXML,
        length: projectXML ? projectXML.length : 0,
        type: typeof projectXML,
        isEmpty: !projectXML || projectXML.trim().length === 0
      });
    }
    
    // Generate response using Gemini
    const response = await generateGeminiResponse(
      message,
      projectXML,
      chatHistory || []
    );

    console.log('✅ Gemini response generated successfully');
    console.log(`📤 Response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
    
    return NextResponse.json({ 
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in Gemini API route:', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to generate response' }, 
      { status: 500 }
    );
  }
}