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
    // Run repomix with stdout to get XML output
    // Using --stdout to get the output directly
    const { stdout } = await execAsync(
      `npx repomix --stdout ${verbose ? "--verbose" : ""}`,
      {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
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
 */
export async function getRepoMetadata(repoPath: string): Promise<{
  branch: string;
  commit: string;
  commitMessage?: string;
}> {
  try {
    const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: repoPath,
    });
    
    const { stdout: commit } = await execAsync("git rev-parse HEAD", {
      cwd: repoPath,
    });
    
    const { stdout: commitMessage } = await execAsync(
      "git log -1 --pretty=%B",
      { cwd: repoPath }
    ).catch(() => ({ stdout: "" }));

    return {
      branch: branch.trim(),
      commit: commit.trim(),
      commitMessage: commitMessage.trim() || undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to get repository metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
