import { create } from "zustand";
import { getUserProjects, deleteProject as deleteProjectFromDB, supabase, getProjectXML } from "@/lib/supabase";

export interface ProjectItem {
  id: string;
  dbId?: string; // Supabase UUID for database operations
  name: string;
  repoUrl: string;
  owner: string;
  repo: string;
  status: "ready" | "ingesting" | "failed";
  xmlContent?: string; // XML content for non-signed-in users (stored locally)
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
}

// localStorage helper functions
const STORAGE_KEY = "what-the-tech-projects";
const XML_STORAGE_PREFIX = "what-the-tech-xml-";
const DIAGRAM_STORAGE_PREFIX = "what-the-tech-diagram-";

export function saveProjectsToLocalStorage(projects: ProjectItem[]): void {
  try {
    // Save projects without XML content (XML is stored separately)
    const projectsWithoutXML = projects.map(({ xmlContent, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsWithoutXML));
  } catch (error) {
    console.error("Failed to save projects to localStorage:", error);
  }
}

export function loadProjectsFromLocalStorage(): ProjectItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const projects = JSON.parse(stored) as ProjectItem[];
    
    // Load XML content for each project
    const projectsWithXML = projects.map((project) => {
      const xmlContent = loadXMLFromLocalStorage(project.id);
      return { ...project, xmlContent };
    });
    
    return projectsWithXML;
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
    // Also delete XML
    deleteXMLFromLocalStorage(projectId);
  } catch (error) {
    console.error("Failed to delete project from localStorage:", error);
  }
}

export function saveXMLToLocalStorage(projectId: string, xmlContent: string): void {
  try {
    localStorage.setItem(`${XML_STORAGE_PREFIX}${projectId}`, xmlContent);
  } catch (error) {
    console.error("Failed to save XML to localStorage:", error);
  }
}

export function loadXMLFromLocalStorage(projectId: string): string | undefined {
  try {
    return localStorage.getItem(`${XML_STORAGE_PREFIX}${projectId}`) || undefined;
  } catch (error) {
    console.error("Failed to load XML from localStorage:", error);
    return undefined;
  }
}

export function deleteXMLFromLocalStorage(projectId: string): void {
  try {
    localStorage.removeItem(`${XML_STORAGE_PREFIX}${projectId}`);
  } catch (error) {
    console.error("Failed to delete XML from localStorage:", error);
  }
}

// Diagram localStorage functions
export function saveDiagramToLocalStorage(projectId: string, diagrams: { businessFlow: string; dataFlow: string; combined: string }): void {
  try {
    localStorage.setItem(`${DIAGRAM_STORAGE_PREFIX}${projectId}`, JSON.stringify(diagrams));
  } catch (error) {
    console.error("Failed to save diagrams to localStorage:", error);
  }
}

export function loadDiagramFromLocalStorage(projectId: string): { businessFlow: string; dataFlow: string; combined: string } | null {
  try {
    const stored = localStorage.getItem(`${DIAGRAM_STORAGE_PREFIX}${projectId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load diagrams from localStorage:", error);
    return null;
  }
}

export function deleteDiagramFromLocalStorage(projectId: string): void {
  try {
    localStorage.removeItem(`${DIAGRAM_STORAGE_PREFIX}${projectId}`);
  } catch (error) {
    console.error("Failed to delete diagrams from localStorage:", error);
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

  // Current XML content (for agent/board context)
  currentXMLContent: string | null;
  setCurrentXMLContent: (xml: string | null) => void;
  loadProjectXML: (projectId: string, isSignedIn: boolean) => Promise<void>;

  // Chat messages
  chatMessages: ChatMessage[];
  isLoadingMessages: boolean;
  loadChatMessages: (projectId: string) => Promise<void>;
  addChatMessage: (projectId: string, content: string, role: 'user' | 'assistant' | 'system') => Promise<void>;
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
      
      // Load XML content for the newly added project
      if (project.xmlContent) {
        // For non-signed-in users, XML is already in project.xmlContent
        set({ currentXMLContent: project.xmlContent });
      } else if (isSignedIn && project.dbId) {
        // For signed-in users, load from database
        get().loadProjectXML(project.dbId, true);
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
    
    if (project) {
      // Load XML content when project is selected
      const isSignedIn = project.dbId !== undefined;
      const projectIdToLoad = isSignedIn ? project.dbId! : project.id;
      state.loadProjectXML(projectIdToLoad, isSignedIn);
    } else {
      set({ currentXMLContent: null });
    }
    
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

  // Current XML content
  currentXMLContent: null,
  setCurrentXMLContent: (xml) => set({ currentXMLContent: xml }),
  
  // Load XML content for a project
  loadProjectXML: async (projectId, isSignedIn) => {
    try {
      if (isSignedIn) {
        // Load from database (Supabase Storage)
        const xmlContent = await getProjectXML(projectId);
        
        // If XML not found in storage, check localStorage as fallback
        if (!xmlContent) {
          console.log("XML not found in storage, checking localStorage as fallback...");
          const localXML = loadXMLFromLocalStorage(projectId);
          if (localXML) {
            console.log("Found XML in localStorage as fallback");
            set({ currentXMLContent: localXML });
          } else {
            console.warn("XML not found in storage or localStorage for project:", projectId);
            set({ currentXMLContent: null });
          }
        } else {
          set({ currentXMLContent: xmlContent });
        }
      } else {
        // Load from localStorage
        const xmlContent = loadXMLFromLocalStorage(projectId);
        set({ currentXMLContent: xmlContent || null });
      }
    } catch (error) {
      console.error("Error loading project XML:", error);
      // Try localStorage as fallback even on error
      if (isSignedIn) {
        const localXML = loadXMLFromLocalStorage(projectId);
        if (localXML) {
          console.log("Error loading from storage, using localStorage fallback");
          set({ currentXMLContent: localXML });
        } else {
          set({ currentXMLContent: null });
        }
      } else {
        set({ currentXMLContent: null });
      }
    }
  },

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
        
          const firstProject = projects.length > 0 ? projects[0] : null;
          
          // Load XML for first project if available
          if (firstProject) {
            const isSignedIn = firstProject.dbId !== undefined;
            const projectIdToLoad = isSignedIn ? firstProject.dbId! : firstProject.id;
            get().loadProjectXML(projectIdToLoad, isSignedIn);
          }
          
          set({
            projects,
            isLoadingProjects: false,
            // Auto-select first project if available
            selectedProjectId: firstProject?.id || null,
            currentRepoUrl: firstProject
              ? `https://github.com/${firstProject.owner}/${firstProject.repo}`
              : null,
          });
      } else {
        // Load from localStorage
        const projects = loadProjectsFromLocalStorage();
        
        if (projects && projects.length > 0) {
          const firstProject = projects[0];
          
          // Load XML for first project
          const xmlContent = loadXMLFromLocalStorage(firstProject.id);
          
          set({
            projects,
            isLoadingProjects: false,
            // Auto-select first project if available
            selectedProjectId: firstProject.id,
            currentRepoUrl: `https://github.com/${firstProject.owner}/${firstProject.repo}`,
            currentXMLContent: xmlContent || null,
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

  // Chat messages
  chatMessages: [],
  isLoadingMessages: false,
  
  loadChatMessages: async (projectId: string) => {
    console.log('🔄 Loading chat messages for project:', projectId);
    set({ isLoadingMessages: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ No access token available for chat API');
        set({ isLoadingMessages: false });
        return;
      }

      const response = await fetch(`/api/chat?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Failed to load chat messages:', response.status, errorData);
        set({ isLoadingMessages: false });
        return;
      }

      const result = await response.json();
      console.log('✅ Loaded chat messages:', result.messages?.length || 0);
      
      set({
        chatMessages: result.messages || [],
        isLoadingMessages: false
      });
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  addChatMessage: async (projectId: string, content: string, role: 'user' | 'assistant' | 'system') => {
    console.log('💬 Adding chat message to project:', projectId, 'Role:', role);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ No access token available for chat API');
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId,
          message: content,
          role
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Failed to add chat message:', response.status, errorData);
        return;
      }

      const result = await response.json();
      console.log('✅ Added chat message:', result.message?.id);
      
      // Add the message to local state
      set((state) => ({
        chatMessages: [...state.chatMessages, {
          id: result.message.id,
          content: content,
          role: role,
          created_at: result.message.created_at
        }]
      }));
    } catch (error) {
      console.error('❌ Error adding chat message:', error);
    }
  }
}));
