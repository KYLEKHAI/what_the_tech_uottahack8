"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, Settings, LogOut, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { handleSignOut as signOutUtil } from "@/lib/auth-utils";

interface ProfileDropdownProps {
  userProfile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export function ProfileDropdown({ userProfile }: ProfileDropdownProps) {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUtil();
  };

  const handleMyProjects = () => {
    router.push('/app');
  };

  const handleAccountSettings = () => {
    router.push('/app/settings');
  };

  const handleSignIn = () => {
    router.push('/signin');
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  // Create initials from user's first and last name
  const getInitials = () => {
    if (!user) return "G"; // Guest user
    if (!userProfile?.first_name && !userProfile?.last_name) return "U";
    const first = userProfile?.first_name?.[0] || "";
    const last = userProfile?.last_name?.[0] || "";
    return (first + last).toUpperCase();
  };

  const getDisplayName = () => {
    if (!user) return "Guest User";
    if (!userProfile?.first_name && !userProfile?.last_name) return "User";
    return `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
          <Avatar className="w-8 h-8">
            {userProfile?.avatar_url && (
              <AvatarImage src={userProfile.avatar_url} alt="Profile" />
            )}
            <AvatarFallback className="bg-black text-white text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{getDisplayName()}</p>
        </div>
        <DropdownMenuSeparator />
        
        {user ? (
          // Authenticated user menu
          <>
            <DropdownMenuItem onClick={handleMyProjects} className="cursor-pointer">
              <FolderOpen className="mr-2 h-4 w-4" />
              <span>My Projects</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAccountSettings} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </>
        ) : (
          // Non-authenticated user menu
          <>
            <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              <span>Sign In</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignUp} className="cursor-pointer focus:text-white" style={{color: 'rgb(0,201,80)'}}>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Sign Up</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}