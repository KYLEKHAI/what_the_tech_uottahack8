import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { loadDiagramsFromStorage } from "@/services/diagram-storage";

/**
 * GET /api/projects/[projectId]/diagrams
 * 
 * Retrieves the Mermaid diagrams for a specific project
 * For signed-in users: fetches from database
 * For guest users: returns structure that frontend can populate from localStorage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    console.log("🎨 Diagrams API called for project:", projectId);
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
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
      console.log("🔐 Authorization header present, using access token");
      
      try {
        // Decode JWT to get user info (simple base64 decode of payload)
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
            
            // Create authenticated client with the access token in headers
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
                  getAll() {
                    return cookieStore.getAll();
                  },
                  setAll() {},
                },
              }
            );
            
            console.log("👤 Token-based authentication successful:", { 
              hasUser: !!user, 
              userId: user?.id, 
              email: user?.email
            });
          } else {
            console.warn("No userId found in token payload");
          }
        } else {
          console.warn("Invalid token format");
        }
      } catch (tokenError) {
        console.error("Error decoding access token:", tokenError);
      }
    } else {
      // Fallback to cookie-based authentication
      console.log("🍪 No Authorization header, checking cookies");
      
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

      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      user = cookieUser;
      
      console.log("👤 Cookie-based authentication:", { 
        hasUser: !!user, 
        userId: user?.id, 
        email: user?.email,
        authError: authError?.message 
      });
    }
    
    if (user) {
      // Signed-in user: get diagrams from database
      console.log("🔐 Signed-in user detected, fetching from database");
      
      const supabaseService = createServerClient(
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

      const { data: projectData, error: projectError } = await supabaseService
        .from('projects')
        .select('board_mermaid, board_updated_at')
        .eq('id', projectId)
        .eq('user_id', user.id) // Ensure user owns the project
        .single();

      console.log("📊 Database query result:", { 
        hasData: !!projectData, 
        hasMermaid: !!projectData?.board_mermaid,
        error: projectError?.message 
      });

      if (projectError) {
        console.error("Error fetching project diagrams:", projectError);
        return NextResponse.json(
          { error: "Failed to load diagrams", details: projectError.message },
          { status: 500 }
        );
      }

      if (!projectData) {
        console.warn("No project found for user:", user.id, "project:", projectId);
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Load diagrams from storage for enhanced persistence
      const storageDiagrams = await loadDiagramsFromStorage(supabase, projectId);

      // Use storage diagrams if available, fallback to database
      const finalBusinessFlow = storageDiagrams.businessFlow || null;
      const finalDataFlow = storageDiagrams.dataFlow || null;
      const finalCombined = projectData.board_mermaid || null;

      console.log("✅ Returning diagrams for signed-in user:", {
        hasBusinessFlow: !!finalBusinessFlow,
        hasDataFlow: !!finalDataFlow,
        hasCombined: !!finalCombined,
        source: (storageDiagrams.businessFlow || storageDiagrams.dataFlow) 
          ? 'storage+database' : 'database'
      });

      return NextResponse.json({
        success: true,
        businessFlow: finalBusinessFlow,
        dataFlow: finalDataFlow,
        combined: finalCombined,
        mermaidCode: finalCombined, // Backward compatibility
        updatedAt: projectData.board_updated_at || null,
        source: (storageDiagrams.businessFlow || storageDiagrams.dataFlow) 
          ? 'storage+database' : 'database'
      });
    } else {
      // Guest user: return structure indicating diagrams should be loaded from localStorage
      console.log("👤 Guest user detected, returning localStorage instructions");
      
      return NextResponse.json({
        success: true,
        mermaidCode: null,
        updatedAt: null,
        source: 'localStorage',
        localStorageKey: `what-the-tech-diagram-${projectId}`
      });
    }

  } catch (error) {
    console.error("Exception in diagrams API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}