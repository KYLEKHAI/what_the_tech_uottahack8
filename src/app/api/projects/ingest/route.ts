import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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

    // Get authenticated user - try from Authorization header first, then cookies
    const authHeader = request.headers.get("authorization");
    let user = null;
    let supabase = null;
    
    const cookieStore = await cookies();
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Use access token from Authorization header
      const accessToken = authHeader.substring(7);
      console.log("Using access token from Authorization header");
      
      // Decode JWT to get user info (simple base64 decode of payload)
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.sub;
          const userEmail = payload.email;
          
          if (userId) {
            // Create a minimal user object
            user = {
              id: userId,
              email: userEmail,
            } as any;
            console.log("User decoded from JWT token:", userEmail, "User ID:", userId);
            
            // Create Supabase client for database operations
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
                      // Ignore cookie set errors in API routes
                    }
                  },
                  remove(name: string, options: CookieOptions) {
                    try {
                      cookieStore.set({ name, value: "", ...options });
                    } catch (error) {
                      // Ignore cookie remove errors in API routes
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
      const cookieStore = await cookies();
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
                // Ignore cookie set errors in API routes
              }
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: "", ...options });
              } catch (error) {
                // Ignore cookie remove errors in API routes
              }
            },
          },
        }
      );

      // Try to get session first, then user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error getting session from API route:", sessionError);
      }
      
      user = session?.user || null;
      
      if (!user) {
        console.log("No user found in session. Trying getUser() as fallback...");
        // Also try getUser as fallback
        const { data: { user: userFromGetUser }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("Error getting user from API route:", userError);
        } else if (userFromGetUser) {
          console.log("Got user from getUser() fallback:", userFromGetUser.email);
          user = userFromGetUser;
        }
      } else {
        console.log("User found in API route from session:", user.email);
      }
    }

    // Run ingestion (this may take a while for large repos)
    const result = await ingestRepository(repoUrl, {
      outputFormat: "xml",
      verbose: false,
    });

    // Create project in database if user is signed in
    let projectId: string | null = null;
    if (user) {
      try {
        const repoUrl = `https://github.com/${result.repoInfo.owner}/${result.repoInfo.name}`;
        
        // Check if project already exists for this user
        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("user_id", user.id)
          .eq("repo_url", repoUrl)
          .single();

        if (existingProject) {
          // Project already exists, use existing ID
          projectId = existingProject.id;
          console.log("Project already exists in database, using existing ID:", projectId);
        } else {
          // Create new project
          const { data: projectData, error: projectError } = await supabase
            .from("projects")
            .insert({
              user_id: user.id,
              repo_url: repoUrl,
              repo_owner: result.repoInfo.owner,
              repo_name: result.repoInfo.name,
              status: "ready",
              default_branch: result.metadata.defaultBranch || "main",
            })
            .select()
            .single();

          if (projectError) {
            console.error("Failed to create project in database:", projectError);
            console.error("Project error details:", JSON.stringify(projectError, null, 2));
            // Continue without database project if creation fails
          } else if (projectData) {
            projectId = projectData.id;
            console.log("Project created successfully in database:", projectId);
          }
        }
      } catch (error) {
        console.error("Exception creating/finding project:", error);
      }
    } else {
      console.log("No user found, project will not be saved to database");
    }

    // Return the ingestion result
    // TODO: Store artifact in Supabase Storage
    // TODO: Start chunking and embedding process

    return NextResponse.json({
      success: true,
      data: {
        projectId, // Return project UUID if created in database
        repoInfo: result.repoInfo,
        metadata: result.metadata,
        artifactSize: result.artifactSize,
        // Return full XML content for download
        xmlContent: result.xmlContent,
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
