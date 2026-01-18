import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export interface RepoInfo {
  owner: string;
  name: string;
  url: string;
  defaultBranch?: string;
}

/**
 * Parse GitHub repository URL and extract owner/name
 */
export function parseGitHubUrl(repoUrl: string): RepoInfo {
  try {
    const url = new URL(repoUrl);
    
    // Handle github.com URLs
    if (url.hostname === "github.com" || url.hostname === "www.github.com") {
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length < 2) {
        throw new Error("Invalid GitHub URL: must include owner and repository name");
      }
      
      return {
        owner: pathParts[0],
        name: pathParts[1].replace(/\.git$/, ""),
        url: repoUrl,
      };
    }
    
    throw new Error("Only GitHub repositories are supported");
  } catch (error) {
    if (error instanceof TypeError) {
      // Try parsing as a simple owner/repo format
      const parts = repoUrl.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return {
          owner: parts[0],
          name: parts[1].replace(/\.git$/, ""),
          url: `https://github.com/${parts[0]}/${parts[1]}`,
        };
      }
    }
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }
}

/**
 * Clone a GitHub repository to a temporary directory
 */
export async function cloneRepository(repoInfo: RepoInfo): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
  
  try {
    // Clone the repository (shallow clone for speed)
    const cloneUrl = repoInfo.url.endsWith(".git") 
      ? repoInfo.url 
      : `${repoInfo.url}.git`;
    
    await execAsync(`git clone --depth 1 ${cloneUrl} .`, {
      cwd: tempDir,
    });
    
    return tempDir;
  } catch (error) {
    // Clean up on error
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup temp directory ${dirPath}:`, error);
  }
}
