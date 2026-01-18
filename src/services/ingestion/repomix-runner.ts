import * as fs from "fs/promises";
import * as path from "path";

export interface RepomixOptions {
  outputFormat?: "xml" | "json" | "markdown";
  outputPath?: string;
  verbose?: boolean;
  skipDiagrams?: boolean; // If true, skip diagram generation
}

// File extensions to include
const INCLUDED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.swift', '.m', '.mm',
  '.vue', '.svelte', '.astro',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.xml',
  '.md', '.mdx', '.txt', '.rst',
  '.sql', '.graphql', '.gql',
  '.sh', '.bash', '.zsh', '.fish',
  '.dockerfile', '.env', '.gitignore',
  '.config', '.lock',
]);

// Directories to skip
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'build', 'out', '.next', '.nuxt', '.output',
  'coverage', '.nyc_output',
  '__pycache__', '.pytest_cache', 'venv', '.venv', 'env',
  '.idea', '.vscode', '.vs',
  'vendor', 'packages', '.yarn',
  'target', 'bin', 'obj',
  '.cache', 'tmp', 'temp',
]);

// Files to skip
const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'Thumbs.db',
]);

// Max file size to include (100KB)
const MAX_FILE_SIZE = 100 * 1024;

interface FileInfo {
  path: string;
  content: string;
  size: number;
}

/**
 * Check if a file should be included based on extension
 */
function shouldIncludeFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  
  // Skip excluded files
  if (EXCLUDED_FILES.has(basename)) {
    return false;
  }
  
  // Include specific config files
  if (basename.startsWith('.') && !basename.includes('.')) {
    return false; // Skip dotfiles without extensions
  }
  
  const ext = path.extname(filePath).toLowerCase();
  
  // Include files with known extensions
  if (INCLUDED_EXTENSIONS.has(ext)) {
    return true;
  }
  
  // Include common config files without extensions
  const configFiles = ['Dockerfile', 'Makefile', 'Procfile', 'Gemfile', 'Rakefile'];
  if (configFiles.includes(basename)) {
    return true;
  }
  
  return false;
}

/**
 * Recursively get all files in a directory
 */
async function getFiles(dirPath: string, basePath: string = dirPath): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }
        
        // Recursively get files from subdirectory
        const subFiles = await getFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        if (!shouldIncludeFile(fullPath)) {
          continue;
        }
        
        try {
          const stats = await fs.stat(fullPath);
          
          // Skip large files
          if (stats.size > MAX_FILE_SIZE) {
            continue;
          }
          
          const content = await fs.readFile(fullPath, 'utf-8');
          
          files.push({
            path: relativePath.replace(/\\/g, '/'), // Normalize to forward slashes
            content,
            size: stats.size,
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }
  
  return files;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate XML output similar to Repomix
 */
function generateXml(files: FileInfo[], repoPath: string): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<repository>
  <metadata>
    <name>${escapeXml(repoName)}</name>
    <generatedAt>${timestamp}</generatedAt>
    <fileCount>${files.length}</fileCount>
    <totalSize>${files.reduce((sum, f) => sum + f.size, 0)}</totalSize>
  </metadata>
  <files>
`;

  for (const file of files) {
    xml += `    <file path="${escapeXml(file.path)}">
      <content><![CDATA[${file.content}]]></content>
    </file>
`;
  }

  xml += `  </files>
</repository>`;

  return xml;
}

/**
 * Run file consolidation on a repository directory to generate XML context
 * This is a pure JS replacement for Repomix that works in serverless environments
 */
export async function runRepomix(
  repoPath: string,
  options: RepomixOptions = {}
): Promise<string> {
  const {
    outputPath,
    verbose = false,
  } = options;

  try {
    if (verbose) {
      console.log(`📂 Scanning repository at ${repoPath}...`);
    }
    
    // Get all files
    const files = await getFiles(repoPath);
    
    if (verbose) {
      console.log(`📄 Found ${files.length} files`);
    }
    
    // Sort files by path for consistent output
    files.sort((a, b) => a.path.localeCompare(b.path));
    
    // Generate XML
    const xmlContent = generateXml(files, repoPath);
    
    if (verbose) {
      console.log(`✅ Generated XML (${xmlContent.length} bytes)`);
    }

    // If we specified an output path, write to file
    if (outputPath) {
      await fs.writeFile(outputPath, xmlContent, "utf-8");
    }

    return xmlContent;
  } catch (error) {
    throw new Error(
      `Failed to generate repository context: ${error instanceof Error ? error.message : String(error)}`
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
