import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { generateDiagramsForExistingProject } from "@/services/retroactive-diagram-generator";
import { saveDiagramsComplete } from "@/services/diagram-storage";

/**
 * POST /api/projects/[projectId]/generate-diagrams
 * 
 * Generates diagrams for an existing project that doesn't have them yet
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    console.log("🎨 Generate diagrams API called for project:", projectId);
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Use service role for this operation since it needs to read and write data
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    // First, get the project details
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      console.error("Project not found:", projectError);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if diagrams already exist
    if (projectData.board_mermaid) {
      console.log("Project already has diagrams, skipping generation");
      return NextResponse.json({
        success: true,
        message: "Project already has diagrams",
        diagrams: {
          mermaidCode: projectData.board_mermaid,
          updatedAt: projectData.board_updated_at
        }
      });
    }

    // Get XML content from storage
    const xmlFileName = `${projectId}/repomix.xml`;
    const { data: xmlData, error: xmlError } = await supabase.storage
      .from('repo-artifacts')
      .download(xmlFileName);

    if (xmlError || !xmlData) {
      console.error("XML not found in storage:", xmlError);
      return NextResponse.json(
        { error: "XML content not found for this project" },
        { status: 404 }
      );
    }

    // Convert blob to text
    const xmlContent = await xmlData.text();
    
    if (!xmlContent || xmlContent.trim().length === 0) {
      return NextResponse.json(
        { error: "XML content is empty" },
        { status: 400 }
      );
    }

    console.log("📄 XML content loaded, generating diagrams...");

    // Generate diagrams
    const repoInfo = {
      owner: projectData.repo_owner,
      name: projectData.repo_name
    };
    
    const diagrams = await generateDiagramsForExistingProject(xmlContent, repoInfo);

    // Save diagrams to both storage and database
    try {
      await saveDiagramsComplete(supabase, projectId, diagrams);
    } catch (saveError) {
      console.error("Failed to save generated diagrams:", saveError);
      return NextResponse.json(
        { error: "Failed to save generated diagrams" },
        { status: 500 }
      );
    }

    console.log("✅ Diagrams generated and saved successfully");

    return NextResponse.json({
      success: true,
      message: "Diagrams generated successfully",
      diagrams: {
        businessFlow: diagrams.businessFlow,
        dataFlow: diagrams.dataFlow,
        combined: null, // No longer used - kept for backward compatibility
        mermaidCode: null, // No longer used - kept for backward compatibility
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Exception in generate diagrams API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}