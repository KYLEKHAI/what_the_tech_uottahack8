import { parseGitHubUrl, cloneRepository, cleanupTempDir, type RepoInfo } from "./repo-fetcher";
import { runRepomix, getRepoMetadata, type RepomixOptions } from "./repomix-runner";
import { generateProjectDiagrams } from "../diagram-generator";

export interface IngestionResult {
  repoInfo: RepoInfo;
  xmlContent: string;
  metadata: {
    branch: string;
    commit: string;
    commitMessage?: string;
  };
  artifactSize: number;
  diagrams: {
    businessFlow: string;
    dataFlow: string;
  };
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

    // 2. Download repository to temporary directory
    const cloneResult = await cloneRepository(repoInfo);
    tempDir = cloneResult.path;

    // 3. Get repository metadata (using downloaded branch info)
    const metadata = await getRepoMetadata(tempDir, cloneResult.branch);

    // 4. Run Repomix to generate XML context
    const xmlContent = await runRepomix(tempDir, {
      ...options,
      outputFormat: "xml",
    });

    // 5. Generate comprehensive project diagrams
    console.log("🎯 Generating project diagrams...");
    const diagrams = await generateProjectDiagrams(xmlContent, repoInfo);

    // 6. Calculate artifact size
    const artifactSize = Buffer.byteLength(xmlContent, "utf-8");

    return {
      repoInfo: {
        ...repoInfo,
        defaultBranch: metadata.branch,
      },
      xmlContent,
      metadata,
      artifactSize,
      diagrams,
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
