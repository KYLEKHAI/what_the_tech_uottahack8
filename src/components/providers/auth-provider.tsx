"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('🔍 Checking for existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('✅ User already signed in:', {
          email: session.user.email,
          id: session.user.id,
          tokenPresent: !!session.access_token,
          tokenLength: session.access_token?.length || 0,
          expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
        });
        setUser(session.user);
      } else {
        console.log('🚫 No existing session found');
        setUser(null);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔄 Auth event: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🎉 USER SUCCESSFULLY SIGNED IN!', {
            email: session.user.email,
            id: session.user.id,
            provider: session.user.app_metadata?.provider || 'unknown',
            tokenPresent: !!session.access_token,
            tokenLength: session.access_token?.length || 0,
            tokenStart: session.access_token?.substring(0, 10) + '...',
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
            refreshToken: !!session.refresh_token
          });
          setUser(session.user);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('🔄 Token refreshed successfully:', {
            email: session.user.email,
            newTokenLength: session.access_token?.length || 0,
            newExpiresAt: new Date(session.expires_at! * 1000).toLocaleString()
          });
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 User profile updated:', session.user.email);
          setUser(session.user);
        } else {
          console.log('📝 Auth state:', { event, hasUser: !!session?.user, userEmail: session?.user?.email });
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      // Clear user state immediately
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}