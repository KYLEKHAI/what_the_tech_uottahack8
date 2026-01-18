"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useAuth } from "./auth-provider";
import { getUserProfile, updateUserThemePreference } from "@/lib/supabase";

type Props = React.PropsWithChildren<{
  attribute?: "class";
  defaultTheme?: "light" | "dark" | "system";
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}>;

// Inner component to handle theme sync with database
function ThemeSync({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [hasLoadedUserTheme, setHasLoadedUserTheme] = React.useState(false);
  const previousUserIdRef = React.useRef<string | null>(null);
  const isInitialMount = React.useRef(true);

  // Load user's theme preference from database on mount/login
  React.useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log("⏳ Waiting for auth to load...");
      return;
    }

    // Check if user changed (login/logout)
    const userIdChanged = previousUserIdRef.current !== (user?.id || null);
    
    if (user && (!hasLoadedUserTheme || userIdChanged)) {
      const loadUserTheme = async () => {
        try {
          console.log("🎨 Loading theme preference for user:", user.id);
          const { data: profile, error } = await getUserProfile(user.id);
          
          if (error) {
            console.error("❌ Error loading profile:", error);
            setHasLoadedUserTheme(true);
            previousUserIdRef.current = user.id;
            return;
          }

          if (!profile) {
            console.log("ℹ️ Profile not found for user");
            setHasLoadedUserTheme(true);
            previousUserIdRef.current = user.id;
            return;
          }

          console.log("📋 Profile data:", { 
            hasThemePreference: !!profile.theme_preference,
            themePreference: profile.theme_preference 
          });

          if (profile.theme_preference) {
            console.log("✅ Found theme preference in database:", profile.theme_preference);
            setTheme(profile.theme_preference);
          } else {
            console.log("ℹ️ No theme preference found in database, using current theme");
            // If user has no theme preference, save current theme to database
            const currentTheme = theme || 'light';
            console.log("💾 Saving current theme to database:", currentTheme);
            try {
              await updateUserThemePreference(user.id, currentTheme as 'light' | 'dark' | 'system');
            } catch (saveError) {
              console.error("❌ Failed to save initial theme:", saveError);
            }
          }
          setHasLoadedUserTheme(true);
          previousUserIdRef.current = user.id;
        } catch (error) {
          console.error("❌ Failed to load user theme preference:", error);
          setHasLoadedUserTheme(true); // Mark as loaded even on error to prevent retry loops
          previousUserIdRef.current = user.id;
        }
      };
      loadUserTheme();
    } else if (!user) {
      // Reset when user logs out
      console.log("👋 User logged out, resetting theme state");
      setHasLoadedUserTheme(false);
      previousUserIdRef.current = null;
      isInitialMount.current = true;
    }
  }, [user, authLoading, hasLoadedUserTheme, setTheme, theme]);

  // Sync theme changes to database when user is logged in
  // Only sync after we've loaded the user's preference to avoid overwriting with localStorage value
  React.useEffect(() => {
    // Skip on initial mount to avoid syncing localStorage value
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (user && theme && hasLoadedUserTheme && previousUserIdRef.current === user.id && !authLoading) {
      const syncThemeToDatabase = async () => {
        try {
          console.log("💾 Syncing theme to database:", theme);
          const { error } = await updateUserThemePreference(user.id, theme as 'light' | 'dark' | 'system');
          if (error) {
            console.error("❌ Failed to sync theme to database:", error);
          } else {
            console.log("✅ Theme synced to database successfully");
          }
        } catch (error) {
          console.error("❌ Error syncing theme to database:", error);
        }
      };
      // Debounce to avoid too many database calls
      const timeoutId = setTimeout(syncThemeToDatabase, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [user, theme, hasLoadedUserTheme, authLoading]);

  return <>{children}</>;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = true,
  disableTransitionOnChange = true,
}: Props) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      storageKey="theme-preference" // Explicit localStorage key
    >
      <ThemeSync>{children}</ThemeSync>
    </NextThemesProvider>
  );
}

