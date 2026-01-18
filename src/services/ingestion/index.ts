import { parseGitHubUrl, cloneRepository, cleanupTempDir, type RepoInfo } from "./repo-fetcher";
import { runRepomix, getRepoMetadata, type RepomixOptions } from "./repomix-runner";

export interface IngestionResult {
  repoInfo: RepoInfo;
  xmlContent: string;
  metadata: {
    branch: string;
    commit: string;
    commitMessage?: string;
  };
  artifactSize: number;
}

/**
 * Main ingestion function: fetches repo and generates XML context using Repomix
 */
export async function ingestRepository(
  repoUrl: string,
  options: RepomixOptions = {}
): Promise<IngestionResult> {
  let tempDir: string | null = null;

  try {
    // 1. Parse and validate repository URL
    const repoInfo = parseGitHubUrl(repoUrl);

    // 2. Clone repository to temporary directory
    tempDir = await cloneRepository(repoInfo);

    // 3. Get repository metadata
    const metadata = await getRepoMetadata(tempDir);

    // 4. Run Repomix to generate XML context
    const xmlContent = await runRepomix(tempDir, {
      ...options,
      outputFormat: "xml",
    });

    // 5. Calculate artifact size
    const artifactSize = Buffer.byteLength(xmlContent, "utf-8");

    return {
      repoInfo: {
        ...repoInfo,
        defaultBranch: metadata.branch,
      },
      xmlContent,
      metadata,
      artifactSize,
    };
  } catch (error) {
    throw new Error(
      `Repository ingestion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // 6. Clean up temporary directory
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}

// Re-export types and utilities
export { parseGitHubUrl, type RepoInfo } from "./repo-fetcher";
export { runRepomix, getRepoMetadata, type RepomixOptions } from "./repomix-runner";
