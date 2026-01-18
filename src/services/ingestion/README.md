# Repository Ingestion Service

This service handles fetching GitHub repositories and generating XML context using Repomix.

## Overview

The ingestion pipeline:
1. Validates and parses GitHub repository URL
2. Clones the repository to a temporary directory
3. Runs Repomix to generate consolidated XML context
4. Returns the XML content along with repository metadata
5. Cleans up temporary files

## Usage

### API Route

```typescript
// POST /api/projects/ingest
const response = await fetch("/api/projects/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    repoUrl: "https://github.com/owner/repo",
  }),
});

const result = await response.json();
// Returns: { success: true, data: { repoInfo, metadata, artifactSize, xmlPreview } }
```

### Direct Service Usage

```typescript
import { ingestRepository } from "@/services/ingestion";

const result = await ingestRepository("https://github.com/owner/repo", {
  outputFormat: "xml",
  verbose: false,
});

// result contains:
// - repoInfo: { owner, name, url, defaultBranch }
// - xmlContent: string (full XML output from Repomix)
// - metadata: { branch, commit, commitMessage }
// - artifactSize: number (bytes)
```

## Files

- `repo-fetcher.ts`: Handles GitHub URL parsing and repository cloning
- `repomix-runner.ts`: Runs Repomix CLI tool and extracts metadata
- `index.ts`: Main ingestion function that orchestrates the process

## Next Steps

- [ ] Store XML artifact in Supabase Storage
- [ ] Parse and chunk XML content for vector search
- [ ] Generate embeddings using Gemini
- [ ] Store chunks + embeddings in Postgres (pgvector)
- [ ] Generate initial Mermaid board seed
- [ ] Save project metadata to database
