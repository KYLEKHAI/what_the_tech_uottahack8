import { create } from "zustand";
import { getUserProjects, deleteProject as deleteProjectFromDB } from "@/lib/supabase";

export interface ProjectItem {
  id: string;
  dbId?: string; // Supabase UUID for database operations
  name: string;
  repoUrl: string;
  owner: string;
  repo: string;
  status: "ready" | "ingesting" | "failed";
}

// localStorage helper functions
const STORAGE_KEY = "what-the-tech-projects";

export function saveProjectsToLocalStorage(projects: ProjectItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save projects to localStorage:", error);
  }
}

export function loadProjectsFromLocalStorage(): ProjectItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ProjectItem[];
  } catch (error) {
    console.error("Failed to load projects from localStorage:", error);
    return null;
  }
}

export function deleteProjectFromLocalStorage(projectId: string): void {
  try {
    const projects = loadProjectsFromLocalStorage();
    if (!projects) return;
    const filtered = projects.filter((p) => p.id !== projectId);
    saveProjectsToLocalStorage(filtered);
  } catch (error) {
    console.error("Failed to delete project from localStorage:", error);
  }
}

interface DashboardStore {
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Board panel state
  isBoardCollapsed: boolean;
  toggleBoard: () => void;

  // Projects management
  projects: ProjectItem[];
  addProject: (project: ProjectItem, isSignedIn?: boolean) => void;
  deleteProject: (projectId: string, isSignedIn?: boolean) => Promise<void>;
  getProjectById: (projectId: string) => ProjectItem | undefined;
  canAddProject: (isSignedIn?: boolean) => boolean;
  getMaxProjects: (isSignedIn?: boolean) => number;
  loadProjects: (isSignedIn: boolean, userId?: string) => Promise<void>;
  isLoadingProjects: boolean;

  // Selected project
  selectedProjectId: string | null;
  setSelectedProject: (projectId: string | null) => void;

  // Panel widths (optional, for persistence)
  chatPanelWidth: number;
  boardPanelWidth: number;
  setPanelWidths: (chat: number, board: number) => void;

  // Current repository
  currentRepoUrl: string | null;
  setCurrentRepoUrl: (url: string | null) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Sidebar state
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Board panel state
  isBoardCollapsed: false,
  toggleBoard: () =>
    set((state) => ({ isBoardCollapsed: !state.isBoardCollapsed })),

  // Projects management
  projects: [],
  isLoadingProjects: false,
  addProject: (project, isSignedIn = false) => {
    set((state) => {
      // Check if project already exists
      const exists = state.projects.some((p) => p.id === project.id);
      if (exists) return state;
      
      // Check project limit
      const maxProjects = isSignedIn ? 5 : 1;
      if (state.projects.length >= maxProjects) {
        return state; // Don't add if at limit
      }
      
      const newProjects = [...state.projects, project];
      
      // If not signed in, save to localStorage
      if (!isSignedIn) {
        saveProjectsToLocalStorage(newProjects);
      }
      
      return {
        projects: newProjects,
        selectedProjectId: project.id, // Auto-select new project
        currentRepoUrl: `https://github.com/${project.owner}/${project.repo}`,
      };
    });
  },
  canAddProject: (isSignedIn = false) => {
    const state = get();
    const maxProjects = isSignedIn ? 5 : 1;
    return state.projects.length < maxProjects;
  },
  getMaxProjects: (isSignedIn = false) => {
    return isSignedIn ? 5 : 1;
  },
  deleteProject: async (projectId, isSignedIn = false) => {
    const state = get();
    const project = state.getProjectById(projectId);
    
    // Delete from database if signed in and project has dbId
    if (isSignedIn && project?.dbId) {
      const { error } = await deleteProjectFromDB(project.dbId);
      if (error) {
        console.error("Failed to delete project from database:", error);
        // Continue with local deletion even if DB deletion fails
      }
    } else if (!isSignedIn) {
      // Delete from localStorage if not signed in
      deleteProjectFromLocalStorage(projectId);
    }
    
    // Remove from Zustand store
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== projectId);
      const wasSelected = state.selectedProjectId === projectId;
      
      // If deleted project was selected, select another one or clear selection
      let newSelectedId: string | null = null;
      let newCurrentRepoUrl: string | null = null;
      
      if (wasSelected && newProjects.length > 0) {
        newSelectedId = newProjects[0].id;
        const selectedProject = newProjects[0];
        newCurrentRepoUrl = `https://github.com/${selectedProject.owner}/${selectedProject.repo}`;
      }
      
      // Update localStorage if not signed in
      if (!isSignedIn) {
        saveProjectsToLocalStorage(newProjects);
      }
      
      return {
        projects: newProjects,
        selectedProjectId: newSelectedId,
        currentRepoUrl: newCurrentRepoUrl,
      };
    });
  },
  getProjectById: (projectId) => {
    const state = get();
    return state.projects.find((p) => p.id === projectId);
  },

  // Selected project
  selectedProjectId: null,
  setSelectedProject: (projectId) => {
    const state = get();
    const project = projectId ? state.getProjectById(projectId) : null;
    set({
      selectedProjectId: projectId,
      currentRepoUrl: project
        ? `https://github.com/${project.owner}/${project.repo}`
        : state.currentRepoUrl,
    });
  },

  // Panel widths
  chatPanelWidth: 60, // percentage
  boardPanelWidth: 40, // percentage
  setPanelWidths: (chat, board) =>
    set({ chatPanelWidth: chat, boardPanelWidth: board }),

  // Current repository
  currentRepoUrl: null,
  setCurrentRepoUrl: (url) => set({ currentRepoUrl: url }),

  // Load projects from persistence layer
  loadProjects: async (isSignedIn, userId) => {
    set({ isLoadingProjects: true });
    
    try {
      if (isSignedIn && userId) {
        // Load from Supabase
        const { data, error } = await getUserProjects(userId);
        
        if (error) {
          console.error("Failed to load projects from database:", error);
          set({ 
            projects: [], // Clear projects on error
            isLoadingProjects: false 
          });
          return;
        }
        
        // Convert database projects to ProjectItem format (handle null/undefined data)
        const projects: ProjectItem[] = (data || []).map((dbProject) => ({
          id: dbProject.id, // Use UUID as string ID for consistency
          dbId: dbProject.id,
          name: dbProject.repo_name,
          repoUrl: `${dbProject.repo_owner}/${dbProject.repo_name}`,
          owner: dbProject.repo_owner,
          repo: dbProject.repo_name,
          status: dbProject.status as "ready" | "ingesting" | "failed",
        }));
        
        set({
          projects,
          isLoadingProjects: false,
          // Auto-select first project if available
          selectedProjectId: projects.length > 0 ? projects[0].id : null,
          currentRepoUrl: projects.length > 0 
            ? `https://github.com/${projects[0].owner}/${projects[0].repo}`
            : null,
        });
      } else {
        // Load from localStorage
        const projects = loadProjectsFromLocalStorage();
        
        if (projects && projects.length > 0) {
          set({
            projects,
            isLoadingProjects: false,
            // Auto-select first project if available
            selectedProjectId: projects[0].id,
            currentRepoUrl: `https://github.com/${projects[0].owner}/${projects[0].repo}`,
          });
        } else {
          set({ isLoadingProjects: false });
        }
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      set({ isLoadingProjects: false });
    }
  },
}));
