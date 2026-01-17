"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProjectsSidebar } from "@/components/dashboard/projects-sidebar";
import { ResizableLayout } from "@/components/dashboard/resizable-layout";

export default function DashboardPage() {
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
