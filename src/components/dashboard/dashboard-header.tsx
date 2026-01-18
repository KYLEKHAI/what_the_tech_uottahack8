"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { getUserProfile } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

export function DashboardHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const isSignedIn = !!user;
  const { projects, deleteProject } = useDashboardStore();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showClearProjectModal, setShowClearProjectModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Fetch user profile when user is authenticated
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await getUserProfile(user.id);
        if (data) {
          setUserProfile(data);
        }
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleNavigation = (e: React.MouseEvent, href: string) => {
    // Only check for non-signed-in users with projects
    if (!isSignedIn && projects.length > 0) {
      e.preventDefault();
      setPendingNavigation(href);
      setShowClearProjectModal(true);
    }
    // If signed in or no projects, navigation proceeds normally
  };

  const handleClearAndNavigate = () => {
    // Clear all projects
    projects.forEach((project) => {
      deleteProject(project.id);
    });
    setShowClearProjectModal(false);
    
    // Navigate to the pending route
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowClearProjectModal(false);
    setPendingNavigation(null);
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        {/* Left: Logo/Home link */}
        <a
          href="/"
          onClick={(e) => handleNavigation(e, "/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image
            src="/what-the-stack-logo.png"
            alt="what-the-tech logo"
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="text-sm font-semibold text-foreground">
            what-the-tech
          </span>
        </a>

        {/* Right: Theme + User Profile Menu */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileDropdown userProfile={userProfile} />
        </div>
      </header>

      {/* Clear Project Modal - For non-signed-in users navigating away */}
      {showClearProjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCancelNavigation}
        >
          <Card
            className="w-full max-w-md border-2 border-primary/50 bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-center text-base font-medium text-foreground">
                You must sign in with an account to save multiple repository projects.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Are you sure you want to clear your current repository project?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelNavigation}
                  className="min-w-[80px]"
                >
                  No
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleClearAndNavigate}
                  className="min-w-[80px]"
                >
                  Yes
                </Button>
              </div>
              <div className="mt-2 text-center">
                <Link href="/signin">
                  <Button variant="link" size="sm" style={{color: 'rgb(0,201,80)'}} className="hover:underline">
                    Sign in to save multiple projects
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
