import { create } from "zustand";

interface DashboardStore {
  // Sidebar state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Selected project
  selectedProjectId: string | null;
  setSelectedProject: (projectId: string | null) => void;

  // Panel widths (optional, for persistence)
  chatPanelWidth: number;
  boardPanelWidth: number;
  setPanelWidths: (chat: number, board: number) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Sidebar state
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Selected project
  selectedProjectId: null,
  setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

  // Panel widths
  chatPanelWidth: 60, // percentage
  boardPanelWidth: 40, // percentage
  setPanelWidths: (chat, board) =>
    set({ chatPanelWidth: chat, boardPanelWidth: board }),
}));
