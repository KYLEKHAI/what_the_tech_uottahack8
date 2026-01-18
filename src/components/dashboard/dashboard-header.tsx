"use client";

import Link from "next/link";
import Image from "next/image";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserProfile } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function DashboardHeader() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);

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
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      {/* Left: Logo/Home link */}
      <Link
        href="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
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
      </Link>

      {/* Right: User Profile Menu */}
      <ProfileDropdown userProfile={userProfile} />
    </header>
  );
}
