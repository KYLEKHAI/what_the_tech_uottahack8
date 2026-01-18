import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Auth helper functions
export const authHelpers = {
  // Sign up with email and password
  signUpWithEmail: async (email: string, password: string, userData?: { first_name?: string, last_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // This will be available in the trigger for profile creation
      }
    })
    return { data, error }
  },

  // Sign in with email and password
  signInWithEmail: async (email: string, password: string) => {
    console.log('🔑 Attempting sign in with email:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      return { data, error };
    }

    if (data.session?.access_token && data.user) {
      console.log('🎉 EMAIL SIGN IN SUCCESS!', {
        email: data.user.email,
        userId: data.user.id,
        provider: 'email',
        tokenReceived: true,
        tokenLength: data.session.access_token.length,
        sessionExpiresAt: new Date(data.session.expires_at! * 1000).toLocaleString(),
        userRole: data.user.role || 'authenticated'
      });
    }

    return { data, error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    console.log('🔑 Attempting sign in with Google...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      console.error('❌ Google sign in failed:', error.message);
    } else {
      console.log('🚀 Google OAuth redirect initiated - user will be redirected to complete sign in');
    }
    
    return { data, error }
  },

  // Sign in with GitHub
  signInWithGitHub: async () => {
    console.log('🔑 Attempting sign in with GitHub...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      console.error('❌ GitHub sign in failed:', error.message);
    } else {
      console.log('🚀 GitHub OAuth redirect initiated - user will be redirected to complete sign in');
    }
    
    return { data, error }
  }
}

// Token validation utility
export async function validateCurrentToken() {
  console.log('🔍 Validating current authentication token...');
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return { valid: false, error: sessionError };
    }

    if (!session?.access_token) {
      console.log('❌ No access token found');
      return { valid: false, error: new Error('No access token') };
    }

    // Test the token by getting user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Token validation failed:', userError);
      return { valid: false, error: userError };
    }

    if (!user) {
      console.log('❌ Token exists but user validation failed');
      return { valid: false, error: new Error('Invalid user') };
    }

    const expiresAt = new Date(session.expires_at! * 1000);
    const timeUntilExpiry = Math.round((session.expires_at! * 1000 - Date.now()) / (1000 * 60));
    
    console.log('✅ TOKEN IS VALID AND FRESH!', {
      userEmail: user.email,
      userId: user.id,
      tokenLength: session.access_token.length,
      expiresAt: expiresAt.toLocaleString(),
      minutesUntilExpiry: timeUntilExpiry,
      isExpiringSoon: timeUntilExpiry < 60,
      lastSignIn: user.last_sign_in_at
    });

    return { 
      valid: true, 
      session, 
      user, 
      expiresAt, 
      minutesUntilExpiry: timeUntilExpiry 
    };
  } catch (error) {
    console.error('❌ Error during token validation:', error);
    return { valid: false, error };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Failed to fetch profile' };
  }
}

export async function updateUserProfile(userId: string, profileData: {
  first_name?: string;
  last_name?: string;
  theme_preference?: 'light' | 'dark' | 'system';
}) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Failed to update profile' };
  }
}

export async function updateUserThemePreference(userId: string, theme: 'light' | 'dark' | 'system') {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        theme_preference: theme,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Failed to update theme preference' };
  }
}

export async function updateUserPassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    return { error: 'Failed to update password' };
  }
}

export async function verifyUserPassword(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { verified: false, error: error.message };
    }

    return { verified: true, error: null };
  } catch (error) {
    return { verified: false, error: 'Failed to verify password' };
  }
}

export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: 'Failed to sign out' };
  }
}

// Project helper functions
export async function createProject(projectData: {
  user_id: string;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  status?: 'created' | 'ingesting' | 'ready' | 'failed';
  default_branch?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: projectData.user_id,
        repo_url: projectData.repo_url,
        repo_owner: projectData.repo_owner,
        repo_name: projectData.repo_name,
        status: projectData.status || 'ready',
        default_branch: projectData.default_branch || 'main',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Failed to create project' };
  }
}

export async function getUserProjects(userId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: null, error: 'Failed to fetch projects' };
  }
}

export async function deleteProject(projectId: string) {
  try {
    console.log(`Deleting project ${projectId} and all associated artifacts...`);
    
    // Delete entire project folder from storage (more robust than individual files)
    // This deletes all files in the projectId/ folder
    const projectFolder = `${projectId}/`;
    const { data: folderFiles, error: listError } = await supabase.storage
      .from('repo-artifacts')
      .list(projectFolder, {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      console.warn(`Could not list files in folder ${projectFolder}:`, listError);
      // Continue with deletion even if listing fails
    } else if (folderFiles && folderFiles.length > 0) {
      // Build list of all file paths in the folder
      const filePaths = folderFiles.map(file => `${projectFolder}${file.name}`);
      
      // Delete all files in the folder
      const { error: storageError } = await supabase.storage
        .from('repo-artifacts')
        .remove(filePaths);

      if (storageError) {
        console.error(`Error deleting storage files in folder ${projectFolder}:`, storageError);
        console.error('Storage error details:', JSON.stringify(storageError, null, 2));
        // Check if it's a permissions error
        if (storageError.message?.includes('permission') || storageError.message?.includes('policy')) {
          console.error('⚠️ Missing DELETE RLS policy on storage.objects. Please create a DELETE policy in Supabase Storage.');
        }
        // Continue with deletion even if storage deletion fails
      } else {
        console.log(`✓ Deleted ${filePaths.length} file(s) from storage folder ${projectFolder}`);
      }
    } else {
      console.log(`No files found in storage folder ${projectFolder}`);
    }

    // Delete artifact records from database
    const { error: deleteArtifactsError } = await supabase
      .from('repo_artifacts')
      .delete()
      .eq('project_id', projectId);

    if (deleteArtifactsError) {
      console.error("Error deleting artifact records:", deleteArtifactsError);
      // Continue with project deletion even if artifact deletion fails
    } else {
      console.log(`✓ Deleted artifact records from repo_artifacts table`);
    }

    // Finally, delete the project itself
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error("Error deleting project:", error);
      return { error: error.message };
    }

    console.log(`✓ Successfully deleted project ${projectId} and all associated artifacts`);
    return { error: null };
  } catch (error) {
    console.error("Exception deleting project:", error);
    return { error: 'Failed to delete project' };
  }
}

export async function deleteUserAccount(userId: string) {
  try {
    const response = await fetch('/api/user/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to delete account' };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: 'Failed to delete account' };
  }
}

// Chat helper functions - Each project IS a chat
export async function addMessage(projectId: string, content: string, role: 'user' | 'assistant' | 'system' = 'user') {
  try {
    console.log('💬 Adding message to project:', projectId, 'Role:', role);
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        content: content,
        role: role
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding message:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Message added successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Unexpected error adding message:', error);
    return { data: null, error: 'Failed to add message' };
  }
}

export async function getChatMessages(projectId: string, userId: string) {
  try {
    console.log('📋 Fetching chat messages for project:', projectId);
    
    const { data, error } = await supabase
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
      .eq('projects.user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching messages:', error);
      return { data: null, error: error.message };
    }

    console.log('✅ Fetched', data?.length || 0, 'messages');
    return { data: data || [], error: null };
  } catch (error) {
    console.error('❌ Unexpected error fetching messages:', error);
    return { data: null, error: 'Failed to fetch messages' };
  }
}

// XML Artifact helper functions
export async function saveProjectXML(projectId: string, xmlContent: string) {
  try {
    // Upload XML to Supabase Storage
    const fileName = `${projectId}/repomix.xml`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('repo-artifacts')
      .upload(fileName, xmlContent, {
        contentType: 'application/xml',
        upsert: true, // Replace if exists
      });

    if (uploadError) {
      // If bucket doesn't exist, log but don't fail completely
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        console.warn("Storage bucket 'repo-artifacts' not found. Please create it in Supabase Storage.");
        return { success: false, error: 'Storage bucket not configured' };
      }
      console.error("Failed to upload XML to storage:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Calculate file size
    const fileSize = Buffer.byteLength(xmlContent, 'utf-8');

    // Save artifact record in database (delete existing first, then insert)
    // Since there's no unique constraint, we delete and re-insert
    await supabase
      .from('repo_artifacts')
      .delete()
      .eq('project_id', projectId)
      .eq('artifact_type', 'repomix');
    
    const { data: artifactData, error: artifactError } = await supabase
      .from('repo_artifacts')
      .insert({
        project_id: projectId,
        artifact_type: 'repomix',
        storage_path: fileName,
        checksum: null, // TODO: Calculate checksum if needed
        file_size: fileSize,
      })
      .select()
      .single();

    if (artifactError) {
      console.error("Failed to save artifact record:", artifactError);
      return { success: false, error: artifactError.message };
    }

    return { success: true, data: artifactData, error: null };
  } catch (error) {
    return { success: false, error: 'Failed to save XML artifact' };
  }
}

export async function getProjectXML(projectId: string): Promise<string | null> {
  try {
    // Get access token for authenticated request
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      console.error("No access token available for XML retrieval");
      return null;
    }

    // Call API route to get XML (handles RLS and authentication server-side)
    const response = await fetch(`${window.location.origin}/api/projects/${projectId}/xml`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log("XML artifact not found for project:", projectId);
      } else {
        console.error("Failed to get XML from API:", response.status, response.statusText);
      }
      return null;
    }

    const data = await response.json();
    return data.xmlContent || null;
  } catch (error) {
    console.error("Error getting project XML:", error);
    return null;
  }
}