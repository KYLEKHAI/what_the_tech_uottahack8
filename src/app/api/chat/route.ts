import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  console.log('🔥 GET /api/chat called');
  
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    console.log('📦 Request params:', { projectId });

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No authorization header found');
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('🔐 Authorization header:', authHeader ? 'present' : 'missing', `(Bearer ${token.substring(0, 10)}...)`);
    console.log('🔑 Extracted token:', { 
      hasToken: !!token, 
      tokenLength: token.length,
      tokenStart: token.substring(0, 10) + '...'
    });

    // Create Supabase client for server-side use
    console.log('🔧 Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify the user token by getting the user
    console.log('👤 Getting user from token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email });

    // Get chat messages for the project
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        role,
        created_at,
        projects!inner (
          id,
          user_id
        )
      `)
      .eq('project_id', projectId)
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.log('❌ Messages error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    console.log('✅ Messages fetched:', messages?.length || 0);
    
    return NextResponse.json({ 
      messages: messages || [],
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.log('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔥 POST /api/chat called');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No authorization header found');
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('🔐 Authorization header present');

    // Create Supabase client for server-side use
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Verify the user token
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email });

    const { projectId, message, role = 'user' } = body;

    if (!projectId || !message) {
      return NextResponse.json({ error: 'Project ID and message required' }, { status: 400 });
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      console.log('❌ Project verification error:', projectError);
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Add message directly to project
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        content: message,
        role: role
      })
      .select('*')
      .single();

    if (messageError) {
      console.log('❌ Message creation error:', messageError);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    console.log('✅ Message created:', newMessage);
    
    return NextResponse.json({ 
      message: newMessage
    });

  } catch (error) {
    console.log('❌ Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}