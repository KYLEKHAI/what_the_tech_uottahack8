/**
 * Test script for repository ingestion
 * 
 * Run with: npx tsx src/services/ingestion/test-ingestion.ts
 * Or: node --loader ts-node/esm src/services/ingestion/test-ingestion.ts
 */

import { ingestRepository } from "./index";

async function testIngestion() {
  // Test with a small public repository (faster for testing)
  const testRepoUrl = process.argv[2] || "https://github.com/octocat/Hello-World";
  
  // For larger repos (slower):
  // const testRepoUrl = "https://github.com/vercel/next.js";
  
  console.log("🚀 Starting repository ingestion test...");
  console.log(`📦 Repository: ${testRepoUrl}\n`);

  try {
    const startTime = Date.now();
    
    const result = await ingestRepository(testRepoUrl, {
      outputFormat: "xml",
      verbose: false,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("✅ Ingestion successful!\n");
    console.log("📊 Results:");
    console.log(`   Owner: ${result.repoInfo.owner}`);
    console.log(`   Name: ${result.repoInfo.name}`);
    console.log(`   Branch: ${result.metadata.branch}`);
    console.log(`   Commit: ${result.metadata.commit.substring(0, 8)}`);
    console.log(`   Artifact Size: ${(result.artifactSize / 1024).toFixed(2)} KB`);
    console.log(`   Duration: ${duration}s\n`);
    
    console.log("📄 XML Preview (first 500 chars):");
    console.log("─".repeat(50));
    console.log(result.xmlContent.substring(0, 500));
    console.log("─".repeat(50));
    console.log(`\n... (${result.xmlContent.length - 500} more characters)\n`);

    // Optionally save to file for inspection
    const fs = await import("fs/promises");
    const path = await import("path");
    const outputPath = path.join(process.cwd(), "test-repomix-output.xml");
    await fs.writeFile(outputPath, result.xmlContent, "utf-8");
    console.log(`💾 Full XML saved to: ${outputPath}`);

  } catch (error) {
    console.error("❌ Ingestion failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the test
testIngestion();
