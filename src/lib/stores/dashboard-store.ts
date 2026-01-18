import { create } from "zustand";

export interface ProjectItem {
  id: string;
  name: string;
  repoUrl: string;
  owner: string;
  repo: string;
  status: "ready" | "ingesting" | "failed";
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
  deleteProject: (projectId: string) => void;
  getProjectById: (projectId: string) => ProjectItem | undefined;
  canAddProject: (isSignedIn?: boolean) => boolean;
  getMaxProjects: (isSignedIn?: boolean) => number;

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
  addProject: (project, isSignedIn = false) =>
    set((state) => {
      // Check if project already exists
      const exists = state.projects.some((p) => p.id === project.id);
      if (exists) return state;
      
      // Check project limit
      const maxProjects = isSignedIn ? 5 : 1;
      if (state.projects.length >= maxProjects) {
        return state; // Don't add if at limit
      }
      
      return {
        projects: [...state.projects, project],
        selectedProjectId: project.id, // Auto-select new project
        currentRepoUrl: `https://github.com/${project.owner}/${project.repo}`,
      };
    }),
  canAddProject: (isSignedIn = false) => {
    const state = get();
    const maxProjects = isSignedIn ? 5 : 1;
    return state.projects.length < maxProjects;
  },
  getMaxProjects: (isSignedIn = false) => {
    return isSignedIn ? 5 : 1;
  },
  deleteProject: (projectId) =>
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== projectId);
      const wasSelected = state.selectedProjectId === projectId;
      
      // If deleted project was selected, select another one or clear selection
      let newSelectedId: string | null = null;
      if (wasSelected && newProjects.length > 0) {
        newSelectedId = newProjects[0].id;
        const selectedProject = newProjects[0];
        return {
          projects: newProjects,
          selectedProjectId: newSelectedId,
          currentRepoUrl: `https://github.com/${selectedProject.owner}/${selectedProject.repo}`,
        };
      }
      
      return {
        projects: newProjects,
        selectedProjectId: newSelectedId,
        currentRepoUrl: newSelectedId ? state.currentRepoUrl : null,
      };
    }),
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
}));
