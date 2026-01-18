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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  // Sign in with GitHub
  signInWithGitHub: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
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
    // Cascade deletion is handled by database foreign key constraints
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
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