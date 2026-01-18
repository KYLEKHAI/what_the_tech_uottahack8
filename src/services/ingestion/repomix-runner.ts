import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

export interface RepomixOptions {
  outputFormat?: "xml" | "json" | "markdown";
  outputPath?: string;
  verbose?: boolean;
}

/**
 * Run Repomix on a repository directory to generate consolidated context
 */
export async function runRepomix(
  repoPath: string,
  options: RepomixOptions = {}
): Promise<string> {
  const {
    outputFormat = "xml",
    outputPath,
    verbose = false,
  } = options;

  // Determine output file path
  const outputFile = outputPath || path.join(repoPath, `repomix.${outputFormat}`);
  
  try {
    // Use locally installed repomix from node_modules to avoid npx cache issues in serverless
    // Find the repomix binary path
    const isWindows = process.platform === 'win32';
    const repomixBin = isWindows ? 'repomix.cmd' : 'repomix';
    const repomixPath = path.join(process.cwd(), 'node_modules', '.bin', repomixBin);
    
    // Set npm cache to /tmp for serverless environments
    const env = {
      ...process.env,
      npm_config_cache: '/tmp/.npm',
      HOME: '/tmp',
    };
    
    // Run repomix with stdout to get XML output
    // Using --stdout to get the output directly
    const { stdout } = await execAsync(
      `"${repomixPath}" --stdout ${verbose ? "--verbose" : ""}`,
      {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
        env,
      }
    );

    // If we specified an output path, write to file
    if (outputPath) {
      await fs.writeFile(outputPath, stdout, "utf-8");
    }

    return stdout;
  } catch (error) {
    throw new Error(
      `Failed to run Repomix: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get repository metadata (branch, commit, etc.)
 * Since we download via GitHub API, we use the default branch info
 */
export async function getRepoMetadata(repoPath: string, branch: string = "main"): Promise<{
  branch: string;
  commit: string;
  commitMessage?: string;
}> {
  // When downloading from GitHub API, we don't have git history
  // Return the branch that was successfully downloaded
  return {
    branch: branch,
    commit: "latest", // We don't have commit hash from ZIP download
    commitMessage: "Downloaded from GitHub",
  };
}
