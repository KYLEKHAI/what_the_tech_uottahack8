import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import AdmZip from "adm-zip";

export interface RepoInfo {
  owner: string;
  name: string;
  url: string;
  defaultBranch?: string;
}

export interface CloneResult {
  path: string;
  branch: string;
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
 * Download repository from GitHub using the API
 */
async function downloadRepositoryZip(repoInfo: RepoInfo, tempDir: string): Promise<string> {
  console.log(`📦 Downloading repository from GitHub API...`);
  
  // Try main branch first, then master
  const branches = ['main', 'master'];
  let lastError: Error | null = null;
  
  for (const branch of branches) {
    try {
      const zipUrl = `https://github.com/${repoInfo.owner}/${repoInfo.name}/archive/refs/heads/${branch}.zip`;
      console.log(`Trying ${branch} branch: ${zipUrl}`);
      
      const response = await fetch(zipUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use adm-zip to extract the files
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      
      // Find the root folder name (usually repo-name-branch)
      const rootFolder = zipEntries[0]?.entryName.split('/')[0];
      
      if (!rootFolder) {
        throw new Error('Invalid ZIP structure');
      }
      
      // Extract all files, stripping the root folder
      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        
        // Remove the root folder from the path
        const relativePath = entry.entryName.substring(rootFolder.length + 1);
        if (!relativePath) continue;
        
        const targetPath = path.join(tempDir, relativePath);
        const targetDir = path.dirname(targetPath);
        
        // Create directory if it doesn't exist
        await fs.mkdir(targetDir, { recursive: true });
        
        // Write the file
        await fs.writeFile(targetPath, entry.getData());
      }
      
      console.log(`✅ Successfully downloaded and extracted ${branch} branch`);
      return branch; // Return the successful branch name
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Failed to download ${branch} branch:`, lastError.message);
    }
  }
  
  throw new Error(`Failed to download repository from any branch: ${lastError?.message}`);
}

/**
 * Download a GitHub repository to a temporary directory using the GitHub API
 */
export async function cloneRepository(repoInfo: RepoInfo): Promise<CloneResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
  
  try {
    console.log('📥 Downloading repository using GitHub API (no git required)');
    const branch = await downloadRepositoryZip(repoInfo, tempDir);
    return {
      path: tempDir,
      branch: branch,
    };
  } catch (error) {
    // Clean up on error
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to download repository: ${error instanceof Error ? error.message : String(error)}`);
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
