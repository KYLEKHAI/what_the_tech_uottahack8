"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

interface ProfileDropdownProps {
  userProfile?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export function ProfileDropdown({ userProfile }: ProfileDropdownProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleMyProjects = () => {
    router.push('/app');
  };

  const handleAccountSettings = () => {
    router.push('/app/settings');
  };

  // Create initials from user's first and last name
  const getInitials = () => {
    if (!userProfile?.first_name && !userProfile?.last_name) return "U";
    const first = userProfile?.first_name?.[0] || "";
    const last = userProfile?.last_name?.[0] || "";
    return (first + last).toUpperCase();
  };

  const getDisplayName = () => {
    if (!userProfile?.first_name && !userProfile?.last_name) return "User";
    return `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-blue-600 text-white text-sm">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}