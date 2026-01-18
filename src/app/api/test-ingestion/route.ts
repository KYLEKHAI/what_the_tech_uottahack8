import { NextRequest, NextResponse } from "next/server";
import { ingestRepository } from "@/services/ingestion";

/**
 * GET /api/test-ingestion?repoUrl=https://github.com/owner/repo
 * 
 * Test endpoint for repository ingestion
 * For development/testing only
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoUrl = searchParams.get("repoUrl") || "https://github.com/octocat/Hello-World";

  try {
    console.log(`🧪 Testing ingestion for: ${repoUrl}`);
    const startTime = Date.now();

    const result = await ingestRepository(repoUrl, {
      outputFormat: "xml",
      verbose: false,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      repoInfo: result.repoInfo,
      metadata: result.metadata,
      artifactSize: result.artifactSize,
      artifactSizeKB: (result.artifactSize / 1024).toFixed(2),
      xmlPreview: result.xmlContent.substring(0, 1000),
      xmlLength: result.xmlContent.length,
      // Full XML in development (remove in production)
      xmlContent: process.env.NODE_ENV === "development" ? result.xmlContent : undefined,
    });
  } catch (error) {
    console.error("Test ingestion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
