import * as fs from "fs/promises";
import * as path from "path";

export interface RepomixOptions {
  outputFormat?: "xml" | "json" | "markdown";
  outputPath?: string;
  verbose?: boolean;
}

// File extensions to include
const INCLUDED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.php', '.swift', '.vue', '.svelte', '.astro',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.xml',
  '.md', '.mdx', '.txt', '.sql', '.graphql', '.gql',
  '.sh', '.bash', '.dockerfile',
]);

// Directories to skip
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'build', 'out', '.next', '.nuxt', '.output',
  'coverage', '.nyc_output', '__pycache__', '.pytest_cache',
  'venv', '.venv', 'env', '.idea', '.vscode', '.vs',
  'vendor', '.yarn', 'target', 'bin', 'obj', '.cache', 'tmp', 'temp',
]);

// Files to skip
const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'Thumbs.db',
]);

const MAX_FILE_SIZE = 100 * 1024; // 100KB

interface FileInfo {
  path: string;
  content: string;
  size: number;
}

function shouldIncludeFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (EXCLUDED_FILES.has(basename)) return false;
  if (basename.startsWith('.') && !basename.includes('.', 1)) return false;
  
  const ext = path.extname(filePath).toLowerCase();
  if (INCLUDED_EXTENSIONS.has(ext)) return true;
  
  const configFiles = ['Dockerfile', 'Makefile', 'Procfile', 'Gemfile', 'Rakefile'];
  return configFiles.includes(basename);
}

async function getFiles(dirPath: string, basePath: string = dirPath): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        const subFiles = await getFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile() && shouldIncludeFile(fullPath)) {
        try {
          const stats = await fs.stat(fullPath);
          if (stats.size > MAX_FILE_SIZE) continue;
          
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: relativePath.replace(/\\/g, '/'),
            content,
            size: stats.size,
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }
  
  return files;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
 * Generate repository context XML (replaces Repomix for serverless compatibility)
 */
export async function runRepomix(
  repoPath: string,
  options: RepomixOptions = {}
): Promise<string> {
  const { outputPath, verbose = false } = options;

  try {
    if (verbose) console.log(`📂 Scanning repository at ${repoPath}...`);
    
    const files = await getFiles(repoPath);
    
    if (verbose) console.log(`📄 Found ${files.length} files`);
    
    files.sort((a, b) => a.path.localeCompare(b.path));
    const xmlContent = generateXml(files, repoPath);
    
    if (verbose) console.log(`✅ Generated XML (${xmlContent.length} bytes)`);

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

export async function getRepoMetadata(repoPath: string, branch: string = "main"): Promise<{
  branch: string;
  commit: string;
  commitMessage?: string;
}> {
  return {
    branch: branch,
    commit: "latest",
    commitMessage: "Downloaded from GitHub",
  };
}
