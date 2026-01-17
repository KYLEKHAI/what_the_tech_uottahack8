# .cursor/rules.md — what-the-tech (uOttaHack 8) Project Context

You are an LLM pair-programmer working inside the **what-the-tech** hackathon codebase. Your job is to help implement, debug, and ship an MVP that analyzes GitHub repositories and provides (1) an **Agent chat** experience and (2) a **Board** experience rendered with **Mermaid**.

This file is the authoritative project context. When responding, optimize for:
- Correctness, grounded implementations, and low-risk defaults
- MVP speed (hackathon constraints) while keeping code clean and extensible
- Consistency with the product flow, UI style, and tech stack below
- Clear separation of concerns (frontend vs API vs worker vs data)

---

## 1) Product Summary

**what-the-tech** converts a GitHub repository into an explorable knowledge hub:
- **Agent**: a chat interface (ChatGPT-like) that answers questions about the repo using RAG.
- **Board**: a Mermaid-rendered diagram view with a toggle for **Board (rendered)** and **Code (raw Mermaid)**.

Core promise:
- Answers should be grounded in repository context (no hallucinations).
- The Board provides a structured overview (architecture/flow) derived from analysis.

---

## 2) UX / Page Flow (Authoritative)

### Home (`/`)
Scrollable in both X and Y.
- Header/Nav:
  - Left: logo image + logo title
  - Right: About (scrolls to About section), then Sign In button
- Hero:
  - Logo title again
  - Subtitle/slogan
  - Input field for GitHub repo URL (primary CTA)
- About section
- Footer: simple logo + year

Behavior:
- About link scrolls to About anchor.
- Repo URL input may:
  - require authentication for ingestion (preferred for simplicity), or
  - allow trial ingestion but gate saving under auth (optional).
- After signup completion, user returns to Home with a visible “Account created / signed in” indication.

### Sign In (`/signin`)
- Title: “Sign in to account”
- Email subtitle + email input + Continue button
- OR divider
- Continue with Google
- Continue with GitHub
- “Don’t have an account? Sign up” → `/signup`

### Create Account (`/signup`)
- Title: “Create an account”
- First name input, Last name input
- Email input + Continue
- OR divider
- Continue with Google
- Continue with GitHub
- “Already have an account? Sign in” → `/signin`

Behavior:
- After creating an account, redirect back to Home with an indication of success/sign-in.

### Dashboard (`/app`) — Main Application
Protected route.
- Top header: small, minimal
- Top-right: user profile icon menu (account details + sign out)
- Main body is one page with 3 areas:
  1) Left: collapsible sidebar of **saved projects**
  2) Middle: **Agent chat** (ChatGPT-like)
  3) Right: **Board panel** (Mermaid)
     - Tab toggle: **Board** and **Code**
     - Board tab renders Mermaid diagram
     - Code tab shows raw Mermaid code

Layout rules:
- Sidebar collapsible via icon.
- Middle and right panels are resizable (split panes).
- Sidebar is not part of resizable split (collapsible only).

---

## 3) Visual / UI Style (Chroma-inspired)

We are inspired by Chroma’s aesthetic (NOT using ChromaDB).
Use:
- **Next.js App Router + TypeScript + React**
- **Tailwind CSS**
- **shadcn/ui** for base components (inputs, buttons, cards, tabs, dropdowns)

Fonts:
- `Inter` for body text
- `JetBrains Mono` for code-like text and Mermaid code view

Color palette (use Tailwind config tokens if possible):
- Background: `#f9f9f8`
- Primary text/headings/buttons: `#040404`
- Cards & inputs: `#ffffff`
- Muted text/borders: `#5e5a56`

General UI guidance:
- Minimal, clean, high-contrast.
- Use whitespace, soft borders, and subtle shadows.
- Prefer shadcn components rather than custom components when possible.
- Keep animations minimal (optional).
- Board panel should feel like an inspectable artifact: diagram + code toggle.

---

## 4) Tech Stack (Authoritative)

### Frontend
- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query (server state: projects, chat sessions, board content)
- Optional Zustand for local UI state (panel widths, selected project, sidebar state)

### Backend (Client-facing)
- Next.js Route Handlers / API routes (TypeScript)
- Auth via Supabase Auth
- Persist user + project data in Supabase Postgres

### Worker / Background Processing
- Node.js/TypeScript worker process for repo ingestion & indexing
- Reason: avoid Vercel/serverless timeouts for long-running ingestion
- Worker can be run separately (local dev) and deployed as separate service if needed.

### Databases / Storage (Two logical stores)
1) **Supabase Postgres** (user/project storage; relational)
2) **pgvector (in Postgres)** for embeddings + vector search

Storage:
- Supabase Storage for large artifacts (e.g., `repomix.xml`, optional repo snapshots)

### AI / LLM
- **Google Gemini** (uOttaHack8 category)
- Use **Google GenAI SDK**: `@google/genai`
- Retrieval context creation tool:
  - **Repomix** (preferred)
  - OneFileLLM as alternative

---

## 5) Key Data Model (Conceptual + Suggested Tables)

Core relational tables:
- `users` (managed by Supabase Auth; optionally mirrored profile fields)
- `projects`
  - id, user_id, repo_url, repo_owner, repo_name, default_branch
  - status: `created | ingesting | ready | failed`
  - created_at, updated_at
- `repo_artifacts`
  - id, project_id, artifact_type (`repomix`), storage_path, checksum, created_at
- `chunks`
  - id, project_id
  - source_type (`file`, `symbol`, `doc`)
  - path (file path), symbol (optional), start_line/end_line (optional)
  - content (text)
  - embedding (pgvector column; dimension depends on embedding model)
  - metadata JSONB (language, imports, etc.)
- `chat_sessions`
  - id, project_id, user_id, title, created_at, updated_at
- `messages`
  - id, chat_session_id, role (`user|assistant|system`), content, created_at
- `ingestion_jobs` (recommended)
  - id, project_id, status, progress (0-1), error_message, started_at, finished_at

Board storage (choose one):
- Option A (fast MVP): `projects.board_mermaid` TEXT + `projects.board_updated_at`
- Option B (versioned): `project_boards` (project_id, mermaid_code, version, created_at)

RLS:
- Enforce `user_id` ownership on projects, sessions, messages, artifacts, chunks.

---

## 6) Backend Responsibilities (What APIs Must Do)

### Authentication
- Supabase Auth (email + OAuth Google/GitHub).
- Frontend uses Supabase client for auth; server verifies session/jwt where needed.

### Project Lifecycle
- Create a project from a repo URL
- Launch ingestion job (async)
- Track status transitions: created → ingesting → ready/failed
- List saved projects by user

### Agent Chat (RAG)
- Accept user message + project_id (+ optional chat_session_id)
- Retrieve top-k relevant chunks via pgvector similarity
- Assemble a grounded prompt with citations (file paths/sections)
- Call Gemini chat model
- Stream response to UI if possible
- Save user + assistant messages

### Board (Mermaid)
- Return current Mermaid code for project
- Provide “seed” diagram created at ingestion completion
- Optionally allow user edits (PUT) for MVP polish

---

## 7) Worker Responsibilities (Repo Ingestion + Indexing)

### Ingestion pipeline (MVP)
1) Validate repo URL and parse owner/name
2) Fetch repository (clone or GitHub API download)
3) Run **Repomix** to create a single consolidated artifact (`repomix.xml` or similar)
4) Upload artifact to Supabase Storage
5) Parse and chunk content:
   - Start with file-level chunks for MVP
   - (Optional) augment with function/class chunks
6) Generate embeddings for chunks (Gemini embedding model or another supported embedding method)
7) Store chunks + embeddings in Postgres (pgvector)
8) Generate initial **Mermaid board seed**:
   - “System overview” flowchart is enough for MVP
   - Save Mermaid code in DB
9) Mark project ready; store timestamps and any summary metadata

Error handling:
- On failure, mark status `failed` + store error message.
- Worker must be idempotent by project_id (safe to re-run).

---

## 8) RAG / Prompting Guidelines (Non-negotiable)

- Responses must be grounded in retrieved repo context.
- When uncertain or missing context: say so explicitly and suggest where to look.
- Prefer citing:
  - file paths
  - symbols/functions/classes
  - high-level module relationships
- Keep answers technical and actionable (how to run, where logic lives, how components connect).

Prompt structure (recommended):
- System: role + constraints (“use only provided context; cite filenames; no hallucinations”)
- Developer: output format preference (bullets, steps, include relevant files)
- User: the user question
- Context: retrieved chunks with metadata

---

## 9) Mermaid Board Guidelines

MVP diagram types:
- Use `flowchart TD` or `flowchart LR` for repo architecture overview.
- Keep diagrams readable: limit node count; group by folders/modules.

Board panel:
- Tab 1: Rendered Mermaid
- Tab 2: Raw Mermaid code (JetBrains Mono, selectable, optionally editable)

If diagram generation is uncertain:
- Prefer a conservative diagram (folders + main modules + entry points) rather than guessing detailed runtime flows.

---

## 10) Repository Conventions

- Use App Router (`app/`) for Next.js routes.
- Keep UI in `components/` with shadcn primitives.
- Keep data fetching hooks in `lib/queries/` or similar.
- Keep API route handlers in `app/api/.../route.ts`.
- Worker code in `worker/` or `services/ingestion-worker/`.

Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server/worker only)
- `GOOGLE_GENAI_API_KEY`
- Storage bucket names, DB connection strings as needed.

---

## 11) Tools & External Resources

### Repo context extraction
- Repomix (preferred) — produces consolidated repo context artifact for indexing.
- OneFileLLM (alternative) — if repomix is blocked or insufficient.

### UI
- shadcn/ui components
- Tailwind CSS
- Mermaid for diagrams

### AI
- Google Gemini via `@google/genai`

### DB
- Supabase (Postgres + Auth + Storage)
- pgvector in Postgres for similarity search

---

## 12) MVP Priorities (Hackathon Reality)

Priority order:
1) Auth + protected dashboard
2) Create project from repo URL + ingestion status
3) Ingestion works for at least one repo end-to-end (artifact → chunks → embeddings)
4) Agent chat answers grounded questions using retrieval
5) Board renders Mermaid seed diagram + code toggle
6) Saved projects in sidebar persist across sessions

Nice-to-have:
- Streaming responses
- Mermaid code editing and saving
- Better chunking (symbol-level)
- Upload/attach context in chat

---

## 13) How the LLM Should Behave When Assisting

When you propose code changes:
- Default to simple, minimal, correct implementations.
- Follow the project’s style tokens and UI structure.
- Avoid introducing new dependencies unless clearly necessary.
- Keep backend/worker separation intact; do not put long-running ingestion inside serverless handlers.
- Use typed interfaces and explicit error handling.
- Prefer deterministic flows for MVP.

When you are missing a detail:
- Make a best-effort assumption consistent with the above constraints.
- Do not block progress with excessive questions—offer a reasonable default and proceed.

---

## 14) Glossary

- **Project**: a saved GitHub repository analysis instance owned by a user.
- **Artifact**: consolidated repo representation stored in Supabase Storage (Repomix output).
- **Chunk**: a piece of text (file/symbol/doc section) stored with embedding for retrieval.
- **RAG**: retrieval augmented generation; we fetch relevant chunks via pgvector then prompt Gemini.
- **Board**: Mermaid diagram representation of repo architecture/flows.
- **Agent**: chat interface powered by Gemini + RAG.

---

End of rules. Treat this as the single source of truth for implementation decisions.
