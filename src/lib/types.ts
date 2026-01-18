// Complete data types matching rules document and SQL schema

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string // References auth.users(id)
  first_name?: string
  last_name?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  repo_url: string
  repo_owner: string
  repo_name: string
  default_branch: string
  status: 'created' | 'ingesting' | 'ready' | 'failed'
  board_mermaid?: string
  board_updated_at?: string
  created_at: string
  updated_at: string
}

export interface RepoArtifact {
  id: string
  project_id: string
  artifact_type: 'repomix'
  storage_path: string
  checksum?: string
  created_at: string
}

export interface Chunk {
  id: string
  project_id: string
  source_type: 'file' | 'symbol' | 'doc'
  path: string
  symbol?: string
  start_line?: number
  end_line?: number
  content: string
  embedding: number[] // pgvector column (vector(1536))
  metadata: Record<string, any> // JSONB
  created_at: string
}

export interface ChatSession {
  id: string
  project_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface IngestionJob {
  id: string
  project_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number // 0-1 decimal
  error_message?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

// API Response types
export interface CreateProjectResponse {
  project: Project
  job: IngestionJob
}

export interface ChatResponse {
  message: Message
  sources?: {
    path: string
    content: string
    start_line?: number
    end_line?: number
    symbol?: string
  }[]
}

export interface RAGContext {
  chunks: {
    id: string
    path: string
    content: string
    start_line?: number
    end_line?: number
    symbol?: string
    source_type: 'file' | 'symbol' | 'doc'
    similarity_score?: number
  }[]
}

// Board types
export interface BoardData {
  mermaid_code: string
  updated_at: string
}

// Worker types
export interface IngestionConfig {
  project_id: string
  repo_url: string
  repo_owner: string
  repo_name: string
  default_branch: string
}

export interface WorkerStatus {
  project_id: string
  status: IngestionJob['status']
  progress: number
  message?: string
  error?: string
}