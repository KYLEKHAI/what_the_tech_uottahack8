import { NextRequest, NextResponse } from "next/server";
import { ingestRepository } from "@/services/ingestion";

/**
 * POST /api/projects/ingest
 * 
 * Ingests a GitHub repository using Repomix to generate XML context
 * 
 * Body: { repoUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "repoUrl is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate GitHub URL format
    if (!repoUrl.includes("github.com")) {
      return NextResponse.json(
        { error: "Only GitHub repositories are supported" },
        { status: 400 }
      );
    }

    // Run ingestion (this may take a while for large repos)
    const result = await ingestRepository(repoUrl, {
      outputFormat: "xml",
      verbose: false,
    });

    // Return the ingestion result
    // TODO: Store artifact in Supabase Storage
    // TODO: Save project metadata to database
    // TODO: Start chunking and embedding process

    return NextResponse.json({
      success: true,
      data: {
        repoInfo: result.repoInfo,
        metadata: result.metadata,
        artifactSize: result.artifactSize,
        // For now, return XML content (in production, return storage path)
        xmlPreview: result.xmlContent.substring(0, 1000), // First 1000 chars as preview
      },
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest repository",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
