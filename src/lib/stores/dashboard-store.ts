import { create } from "zustand";

interface DashboardStore {
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Board panel state
  isBoardCollapsed: boolean;
  toggleBoard: () => void;

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

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Sidebar state
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Board panel state
  isBoardCollapsed: false,
  toggleBoard: () =>
    set((state) => ({ isBoardCollapsed: !state.isBoardCollapsed })),

  // Selected project
  selectedProjectId: null,
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

  // Panel widths
  chatPanelWidth: 60, // percentage
  boardPanelWidth: 40, // percentage
  setPanelWidths: (chat, board) =>
    set({ chatPanelWidth: chat, boardPanelWidth: board }),

  // Current repository
  currentRepoUrl: "https://github.com/owner/repo", // Default mock repo, will be set from home page
  setCurrentRepoUrl: (url) => set({ currentRepoUrl: url }),
}));
