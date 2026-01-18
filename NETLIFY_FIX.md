# Netlify Deployment Fix - Repomix Issue

## Problem
When deploying to Netlify, repository ingestion failed with:
```
npm error code ENOENT
npm error syscall mkdir
npm error path /home/sbx_user1051
npm error errno ENOENT
```

## Root Cause
- `npx repomix` was trying to download/install repomix at runtime in the serverless function
- Netlify's serverless environment doesn't have write permissions to `/home/sbx_user1051` (npm's default cache directory)
- Even though `repomix` was in `package.json`, `npx` tries to verify/re-download it

## Solution Applied
Changed from `npx repomix` to using the locally installed version from `node_modules/.bin/`:

### Changes Made in `src/services/ingestion/repomix-runner.ts`:

```typescript
// OLD (failed in serverless):
const { stdout } = await execAsync(
  `npx repomix --stdout ${verbose ? "--verbose" : ""}`,
  {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024,
  }
);

// NEW (works in serverless):
const isWindows = process.platform === 'win32';
const repomixBin = isWindows ? 'repomix.cmd' : 'repomix';
const repomixPath = path.join(process.cwd(), 'node_modules', '.bin', repomixBin);

const env = {
  ...process.env,
  npm_config_cache: '/tmp/.npm',
  HOME: '/tmp',
};

const { stdout } = await execAsync(
  `"${repomixPath}" --stdout ${verbose ? "--verbose" : ""}`,
  {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024,
    env,
    shell: true,
  }
);
```

## Key Changes:
1. ✅ **Direct path to repomix binary** instead of `npx`
2. ✅ **Set npm cache to /tmp** (writable in serverless)
3. ✅ **Set HOME to /tmp** (writable in serverless)
4. ✅ **Cross-platform support** (Windows uses `.cmd`, Unix uses plain binary)
5. ✅ **Shell execution** for better command resolution

## Deployment Steps:
1. Code changes committed and pushed to GitHub
2. Netlify will auto-deploy (usually takes 2-3 minutes)
3. Check Netlify dashboard for build status
4. Test with a GitHub repository URL

## Verification:
After deployment completes, test by:
1. Going to your deployed site
2. Entering a public GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Checking that ingestion completes without the ENOENT error

## Additional Notes:
- Repomix is already installed during build time via `npm install`
- This fix ensures we use the build-time installed version
- Works in both local development and Netlify serverless functions
- Also works on Vercel and other serverless platforms

## If Issue Persists:
Check Netlify function logs for:
1. Verify repomix is in node_modules during build
2. Check Node version is 20 (set in netlify.toml)
3. Verify all environment variables are set
4. Check function execution time (should be < 10s for small repos)
