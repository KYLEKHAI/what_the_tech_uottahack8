import { signOutUser } from '@/lib/supabase';

export const handleSignOut = async () => {
  try {
    // Clear any local storage or session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Sign out from Supabase
    const { success, error } = await signOutUser();
    
    if (!success) {
      console.error('Sign out error:', error);
    }
    
    // Force a full page reload to ensure clean state
    window.location.href = '/';
    
  } catch (error) {
    console.error('Sign out failed:', error);
    // Force navigation even on error
    window.location.href = '/';
  }
};