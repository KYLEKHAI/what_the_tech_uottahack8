"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProjectsSidebar } from "@/components/dashboard/projects-sidebar";
import { ResizableLayout } from "@/components/dashboard/resizable-layout";
import { useAuth } from "@/components/providers/auth-provider";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { loadProjects, isLoadingProjects } = useDashboardStore();
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);

  // Load projects when dashboard mounts
  useEffect(() => {
    if (!authLoading && !hasLoadedProjects) {
      const isSignedIn = !!user;
      // Add a small delay to ensure database transaction is committed
      const timer = setTimeout(() => {
        loadProjects(isSignedIn, user?.id).then(() => {
          setHasLoadedProjects(true);
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, hasLoadedProjects, loadProjects]);

  // Don't redirect unauthenticated users anymore
  // Let them access the dashboard with limited functionality

  if (authLoading || (!hasLoadedProjects && isLoadingProjects)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Remove the auth guard - allow everyone to access dashboard
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <DashboardHeader />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Projects */}
        <ProjectsSidebar />

        {/* Middle and Right Panels - Resizable */}
        <div className="flex-1 overflow-hidden">
          <ResizableLayout />
        </div>
      </div>
    </div>
  );
}
