"use client";

import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock projects data
const mockProjects = [
  {
    id: "1",
    name: "next.js",
    repoUrl: "vercel/next.js",
    status: "ready" as const,
  },
  {
    id: "2",
    name: "react",
    repoUrl: "facebook/react",
    status: "ready" as const,
  },
  {
    id: "3",
    name: "typescript",
    repoUrl: "microsoft/TypeScript",
    status: "ingesting" as const,
  },
];

export function ProjectsSidebar() {
  const { isSidebarCollapsed, toggleSidebar, selectedProjectId, setSelectedProject } =
    useDashboardStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500";
      case "ingesting":
        return "bg-yellow-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-3">
        {!isSidebarCollapsed && (
          <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Projects List */}
      {!isSidebarCollapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-2">
            {mockProjects.map((project) => (
              <Card
                key={project.id}
                className={cn(
                  "cursor-pointer p-3 transition-colors hover:bg-accent",
                  selectedProjectId === project.id && "bg-primary/5 border-primary"
                )}
                onClick={() => setSelectedProject(project.id)}
              >
                <div className="flex items-start gap-2">
                  <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {project.name}
                      </p>
                      <div
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          getStatusColor(project.status)
                        )}
                        title={project.status}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.repoUrl}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed state - just icons */}
      {isSidebarCollapsed && (
        <div className="flex flex-col items-center gap-2 p-2">
          {mockProjects.map((project) => (
            <Button
              key={project.id}
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10",
                selectedProjectId === project.id && "bg-primary/10"
              )}
              onClick={() => setSelectedProject(project.id)}
              title={project.name}
            >
              <GitBranch className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
