import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * GET /api/projects/[projectId]/xml
 * 
 * Retrieves XML content for a project from Supabase Storage
 * 
 * Requires authentication - only returns XML for projects owned by the user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> | { projectId: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const { projectId } = resolvedParams;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const authHeader = request.headers.get("authorization");
    let user = null;
    let supabase = null;
    
    const cookieStore = await cookies();
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const accessToken = authHeader.substring(7);
      
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.sub;
          const userEmail = payload.email;
          
          if (userId) {
            user = {
              id: userId,
              email: userEmail,
            } as any;
            
            supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
                cookies: {
                  get(name: string) {
                    return cookieStore.get(name)?.value;
                  },
                  set(name: string, value: string, options: CookieOptions) {
                    try {
                      cookieStore.set({ name, value, ...options });
                    } catch (error) {
                      // Ignore cookie set errors
                    }
                  },
                  remove(name: string, options: CookieOptions) {
                    try {
                      cookieStore.set({ name, value: "", ...options });
                    } catch (error) {
                      // Ignore cookie remove errors
                    }
                  },
                },
              }
            );
          }
        }
      } catch (decodeError) {
        console.error("Error decoding JWT token:", decodeError);
      }
    }
    
    // Fallback to cookie-based authentication
    if (!user || !supabase) {
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {
                // Ignore cookie set errors
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: "", ...options });
              } catch (error) {
                // Ignore cookie remove errors
              }
            },
          },
        }
      );

      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
      
      if (!user) {
        const { data: { user: userFromGetUser } } = await supabase.auth.getUser();
        user = userFromGetUser || null;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden - project does not belong to user" },
        { status: 403 }
      );
    }

    // Get artifact record - RLS policies will enforce user ownership
    // (We've already verified user owns the project at the application level)
    const { data: artifact, error: artifactError } = await supabase
      .from("repo_artifacts")
      .select("storage_path")
      .eq("project_id", projectId)
      .eq("artifact_type", "repomix")
      .single();

    if (artifactError) {
      console.error("Error querying repo_artifacts:", artifactError);
      console.error("Project ID:", projectId);
      console.error("User ID:", user.id);
      
      // Check if it's an RLS policy issue
      if (artifactError.code === "PGRST116" || artifactError.message?.includes("permission denied")) {
        console.error("Possible RLS policy issue - user may not have permission to read artifacts");
      }
      
      return NextResponse.json(
        { 
          error: "XML artifact not found",
          details: artifactError.message,
          code: artifactError.code 
        },
        { status: 404 }
      );
    }

    if (!artifact) {
      console.warn("Artifact record not found for project:", projectId);
      return NextResponse.json(
        { error: "XML artifact not found" },
        { status: 404 }
      );
    }

    console.log("Found artifact record:", artifact.storage_path);

    // Download XML from storage - RLS policies will enforce user ownership
    const { data: xmlData, error: downloadError } = await supabase.storage
      .from("repo-artifacts")
      .download(artifact.storage_path);

    if (downloadError || !xmlData) {
      console.error("Failed to download XML from storage:", downloadError);
      return NextResponse.json(
        { error: "Failed to retrieve XML from storage" },
        { status: 500 }
      );
    }

    // Convert blob to text
    const xmlContent = await xmlData.text();

    return NextResponse.json({
      success: true,
      xmlContent,
    });
  } catch (error) {
    console.error("Error getting project XML:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve XML",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
