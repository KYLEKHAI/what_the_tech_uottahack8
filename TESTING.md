# Testing Repository Ingestion

## Quick Test Methods

### Method 1: Test API Route (Easiest)

1. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

2. Open your browser or use curl:
   ```bash
   # Test with default small repo
   curl http://localhost:3000/api/test-ingestion
   
   # Test with a specific repo
   curl "http://localhost:3000/api/test-ingestion?repoUrl=https://github.com/octocat/Hello-World"
   ```

3. Or visit in browser:
   ```
   http://localhost:3000/api/test-ingestion?repoUrl=https://github.com/octocat/Hello-World
   ```

### Method 2: Run Test Script Directly

1. Run the test script:
   ```bash
   npm run test:ingestion
   ```

2. Or test with a specific repo:
   ```bash
   npx tsx src/services/ingestion/test-ingestion.ts "https://github.com/octocat/Hello-World"
   ```

### Method 3: Test Repomix Directly

1. Test Repomix CLI on current directory:
   ```bash
   npx repomix --stdout
   ```

2. Test on a cloned repo:
   ```bash
   git clone https://github.com/octocat/Hello-World /tmp/test-repo
   cd /tmp/test-repo
   npx repomix --stdout
   ```

## Expected Output

When successful, you should see:
- ✅ Repository cloned successfully
- ✅ Repomix generates XML output
- ✅ XML content with repository structure
- ✅ Metadata (branch, commit, etc.)
- ✅ Artifact size in KB

## Troubleshooting

### Error: "git: command not found"
- Install Git: `brew install git` (macOS) or download from [git-scm.com](https://git-scm.com)

### Error: "Failed to clone repository"
- Check internet connection
- Verify the repository URL is correct and public
- Ensure you have Git installed

### Error: "Failed to run Repomix"
- Verify Repomix is installed: `npm list repomix`
- Check if the repository has files to process
- Try with a smaller repository first

### Timeout Issues
- Large repositories may take time
- Start with small repos like `octocat/Hello-World`
- Consider using `--depth 1` for faster clones (already implemented)

## Test Repositories (Small to Large)

1. **Tiny** (fastest): `https://github.com/octocat/Hello-World`
2. **Small**: `https://github.com/vercel/next.js` (larger, slower)
3. **Medium**: Any public repository you want to test
