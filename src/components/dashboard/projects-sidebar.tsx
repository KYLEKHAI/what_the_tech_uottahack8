"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, GitBranch, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectsSidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const isSignedIn = !!user;
  const {
    isSidebarCollapsed,
    toggleSidebar,
    projects,
    selectedProjectId,
    setSelectedProject,
    deleteProject,
    getMaxProjects,
  } = useDashboardStore();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation(); // Prevent card click
    setDeleteConfirmId(projectId);
  };

  const handleDeleteConfirm = (projectId: string) => {
    const wasLastProject = projects.length === 1;
    const wasSelected = selectedProjectId === projectId;

    deleteProject(projectId);
    setDeleteConfirmId(null);

    // If it was the last project, redirect to home
    if (wasLastProject) {
      router.push("/");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
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
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2">
            {projects.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-center text-sm text-muted-foreground">
                  No projects yet. Analyze a repository to get started.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              {projects.map((project) => {
                const isSelected = selectedProjectId === project.id;
                const isDeleting = deleteConfirmId === project.id;

                return (
                  <div key={project.id} className="relative">
                    <Card
                      className={cn(
                        "group cursor-pointer p-3 transition-all",
                        isSelected
                          ? "bg-primary/20 border-primary border-2 shadow-md"
                          : "border-border hover:bg-accent"
                      )}
                      onClick={() => setSelectedProject(project.id)}
                    >
                      <div className="flex items-start gap-2">
                        <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "truncate text-sm font-medium",
                                isSelected ? "text-primary font-semibold" : "text-foreground"
                              )}
                            >
                              {project.name}
                            </p>
                            {/* Status dot - green for selected, yellow for others */}
                            <div
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                isSelected ? "bg-green-500" : "bg-yellow-500"
                              )}
                              title={isSelected ? "Active" : "Available"}
                            />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {project.repoUrl}
                          </p>
                        </div>
                        {/* Trash icon - only show on hover */}
                        {!isDeleting && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => handleDeleteClick(e, project.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </Card>

                  </div>
                );
              })}
            </div>
            )}
          </div>
          
          {/* Project Count Footer */}
          <div className="border-t border-border bg-muted/30 px-3 py-2">
            <p className="text-xs text-center text-muted-foreground">
              {projects.length}/{getMaxProjects(isSignedIn)} Projects
            </p>
          </div>
        </div>
      )}

      {/* Collapsed state - just icons */}
      {isSidebarCollapsed && (
        <div className="flex flex-col items-center gap-2 p-2">
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            return (
              <Button
                key={project.id}
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-10 w-10",
                  isSelected && "bg-primary/20"
                )}
                onClick={() => setSelectedProject(project.id)}
                title={project.name}
              >
                <GitBranch className="h-4 w-4" />
                {/* Status dot in collapsed view */}
                <div
                  className={cn(
                    "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-card",
                    isSelected ? "bg-green-500" : "bg-yellow-500"
                  )}
                />
              </Button>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal - Full Screen Overlay */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleDeleteCancel}
        >
          <Card
            className="w-full max-w-md border-2 border-destructive/50 bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-center text-base font-medium text-foreground">
                Are you sure you want to delete this repository?
              </p>
              {projects.length === 1 && (
                <p className="text-center text-sm text-muted-foreground">
                  This is your only project. You will be redirected to the home page after deletion.
                </p>
              )}
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteCancel}
                  className="min-w-[80px]"
                >
                  No
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteConfirm(deleteConfirmId)}
                  className="min-w-[80px]"
                >
                  Yes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
