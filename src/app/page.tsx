"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sparkles, Zap, Layers, Shield, MessageSquare, GitBranch, Code, AlertCircle, Loader2, CheckCircle2, FileCode, Eye, Package, Network, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore, saveXMLToLocalStorage, saveDiagramToLocalStorage } from "@/lib/stores/dashboard-store";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserProfile, supabase } from "@/lib/supabase";

const features = [
  {
    id: 1,
    title: "Instant Repository Analysis",
    icon: Zap,
    description: "Analyze any GitHub repository instantly",
    content: "Simply paste a GitHub repository URL and get immediate insights. Our system uses Repomix to generate comprehensive XML analysis of your entire codebase, extracting file structures, dependencies, and project metadata. No account needed to get started. Analyze public repositories instantly!",
  },
  {
    id: 2,
    title: "AI-Powered Agent Chat",
    icon: MessageSquare,
    description: "Chatbox conversations powered by Google Gemini AI",
    content: "Ask questions about your codebase and get intelligent, context-aware answers with file citations. Powered by Google Gemini AI, our agent provides accurate responses grounded in your repository's actual code. Every answer includes references to specific files and code sections, ensuring reliable and verifiable insights.",
  },
  {
    id: 3,
    title: "Interactive Mermaid Board",
    icon: GitBranch,
    description: "Visual architecture diagrams with rendered and code views",
    content: "Explore your repository structure through interactive Mermaid diagrams. Toggle between rendered visualizations and raw Mermaid code to understand your project's architecture, data flows, and component relationships. The Board provides both high-level overviews and detailed technical diagrams generated from your codebase analysis.",
  },
  {
    id: 4,
    title: "Context Caching",
    icon: Sparkles,
    description: "Smart caching for faster responses and reduced token usage",
    content: "Our system intelligently caches responses for identical questions, saving tokens and providing instant answers. Combined with optimized prompt engineering and smart chat history management, this ensures efficient API usage while maintaining high-quality, context-aware responses.",
  },
  {
    id: 5,
    title: "Deep Code Understanding",
    icon: Code,
    description: "Comprehensive analysis with Repomix and AI processing",
    content: "We analyze your entire codebase using Repomix to extract file structures, code patterns, and relationships. The system processes everything from configuration files to source code, building a complete understanding of your project's architecture, dependencies, and implementation details.",
  },
];

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState(features[0]);
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [typedContent, setTypedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const router = useRouter();
  const { setCurrentRepoUrl, addProject, projects, canAddProject, getMaxProjects, loadProjects } = useDashboardStore();
  const { user, loading } = useAuth();
  const isSignedIn = !!user;

  const loadingSteps = [
    { label: "Validating repository", icon: CheckCircle2 },
    { label: "Cloning repository", icon: GitBranch },
    { label: "Analyzing codebase", icon: FileCode },
    { label: "Generating context", icon: Sparkles },
  ];

  // Fetch user profile and load projects when user is authenticated
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await getUserProfile(user.id);
        if (data) {
          setUserProfile(data);
        }
      }
    };

    if (user) {
      fetchProfile();
      // Load projects for validation
      loadProjects(true, user.id);
    } else {
      setUserProfile(null);
    }
  }, [user, loadProjects]);

  const validateGitHubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Check if it's a GitHub URL
      if (urlObj.hostname !== "github.com" && urlObj.hostname !== "www.github.com") {
        return false;
      }
      // Check if it has owner/repo format
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length < 2) {
        return false;
      }
      return true;
    } catch {
      // Try parsing as owner/repo format
      const parts = url.trim().split("/").filter(Boolean);
      if (parts.length >= 2 && !parts[0].includes(".") && !parts[1].includes(".")) {
        return true;
      }
      return false;
    }
  };

  const normalizeRepoUrl = (url: string): string => {
    const trimmed = url.trim();
    // If it's already a full URL, return it
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    // If it's owner/repo format, convert to full URL
    const parts = trimmed.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `https://github.com/${parts[0]}/${parts[1]}`;
    }
    return trimmed;
  };


  const handleAnalyze = async () => {
    setError(null);
    
    // Validate URL
    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    const normalizedUrl = normalizeRepoUrl(repoUrl);
    
    if (!validateGitHubUrl(normalizedUrl)) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    // Extract owner and repo from URL for validation
    let repoOwner = "";
    let repoName = "";
    try {
      const url = new URL(normalizedUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        repoOwner = pathParts[0];
        repoName = pathParts[1];
      }
    } catch {
      // If URL parsing fails, try to extract from normalized URL
      const match = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        repoOwner = match[1];
        repoName = match[2];
      }
    }

    // Validate project limits and duplicates for signed-in users
    if (isSignedIn) {
      // Check if user can add more projects
      if (!canAddProject(true)) {
        setError("Cannot go over project limit. Delete a repo first to add a new one.");
        return;
      }

      // Check for duplicate repository
      const repoUrlFormatted = `${repoOwner}/${repoName}`;
      const isDuplicate = projects.some(
        (p) => p.repoUrl === repoUrlFormatted || 
               (p.owner === repoOwner && p.repo === repoName)
      );

      if (isDuplicate) {
        setError("Cannot add duplicate repo. This repository has already been added to your projects.");
        return;
      }
    } else {
      // For non-signed-in users, check localStorage projects
      const repoUrlFormatted = `${repoOwner}/${repoName}`;
      const isDuplicate = projects.some(
        (p) => p.repoUrl === repoUrlFormatted || 
               (p.owner === repoOwner && p.repo === repoName)
      );

      if (isDuplicate) {
        setError("This repository has already been added. Please sign in to add multiple repositories.");
        return;
      }

      // Check project limit for non-signed-in users
      if (projects.length >= 1) {
        setError("You can only have 1 project without an account. Please sign in to add multiple repositories.");
        return;
      }
    }

    setIsLoading(true);
    setLoadingStep(0);

    // Simulate progress steps for better UX with variable timing
    const stepTimings = [1500, 3000, 2500, 2000]; // ms for each step
    let currentStepIndex = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const advanceStep = () => {
      if (currentStepIndex < loadingSteps.length - 1) {
        currentStepIndex++;
        setLoadingStep(currentStepIndex);
        timeoutId = setTimeout(advanceStep, stepTimings[currentStepIndex] || 2000);
      }
    };
    
    // Start the first step after initial delay
    timeoutId = setTimeout(advanceStep, stepTimings[0]);

    try {
      // Get access token from Supabase session to pass to API route
      let accessToken: string | null = null;
      if (isSignedIn && user) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
      }

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if we have an access token
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/projects/ingest", {
        method: "POST",
        headers,
        credentials: "include", // Ensure cookies are sent with the request
        body: JSON.stringify({ repoUrl: normalizedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to process repository");
      }

      if (data.success && data.data) {
        if (timeoutId) clearTimeout(timeoutId);
        // Ensure all steps are marked as completed
        setLoadingStep(loadingSteps.length - 1);
        
        const repoName = `${data.data.repoInfo.owner}-${data.data.repoInfo.name}`;
        
        // Use database UUID if available (signed-in user), otherwise generate string ID
        const projectId = data.data.projectId || `${data.data.repoInfo.owner}-${data.data.repoInfo.name}-${Date.now()}`;
        
        // Log for debugging
        if (isSignedIn) {
          if (data.data.projectId) {
            console.log("Project created in database with ID:", data.data.projectId);
          } else {
            console.warn("User is signed in but projectId is missing. Project may not be saved to database.");
          }
        }
        
        // Save XML content (for non-signed-in users, store locally; for signed-in, already in database)
        if (!isSignedIn && data.data.xmlContent) {
          // Save XML to localStorage for non-signed-in users
          saveXMLToLocalStorage(projectId, data.data.xmlContent);
        }

        // Save diagrams (for non-signed-in users, store locally; for signed-in, already in database)
        if (!isSignedIn && data.data.diagrams) {
          // Save diagrams to localStorage for non-signed-in users
          saveDiagramToLocalStorage(projectId, data.data.diagrams);
          console.log("💾 Saved diagrams to localStorage for guest user:", projectId);
        }

        // Add project to store and select it (this also sets currentRepoUrl)
        // Store XML locally if:
        // 1. User is not signed in (always store locally)
        // 2. User is signed in but XML wasn't saved to storage (fallback)
        const shouldStoreXMLLocally = !isSignedIn || (isSignedIn && data.data.xmlContent && !data.data.xmlSaved);
        addProject({
          id: projectId, // Use UUID as string ID if from database, otherwise generated ID
          dbId: data.data.projectId || undefined, // Store database UUID if available
          name: data.data.repoInfo.name,
          repoUrl: `${data.data.repoInfo.owner}/${data.data.repoInfo.name}`,
          owner: data.data.repoInfo.owner,
          repo: data.data.repoInfo.name,
          status: "ready",
          xmlContent: shouldStoreXMLLocally ? data.data.xmlContent : undefined,
        }, isSignedIn);

        // Small delay before redirect to show completion
        setTimeout(() => {
          router.push("/app");
        }, 800);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("Ingestion error:", err);
      let errorMessage = "Failed to process repository. Please try again.";
      
      if (err instanceof Error) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes("private") || errMsg.includes("authentication") || errMsg.includes("permission")) {
          errorMessage = "This repository appears to be private. Only public repositories are supported.";
        } else if (errMsg.includes("not found") || errMsg.includes("404")) {
          errorMessage = "Repository not found. Please check the URL and ensure the repository exists.";
        } else if (errMsg.includes("clone") || errMsg.includes("git")) {
          errorMessage = "Failed to access repository. Please ensure it's a public GitHub repository.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleAnalyze();
    }
  };

  // Auto-dismiss error after 5 seconds with smooth fade
  useEffect(() => {
    if (error) {
      setIsErrorVisible(true);
      const fadeTimer = setTimeout(() => {
        setIsErrorVisible(false);
        // Remove from DOM after fade animation
        setTimeout(() => {
          setError(null);
        }, 300);
      }, 5000);
      return () => clearTimeout(fadeTimer);
    } else {
      setIsErrorVisible(false);
    }
  }, [error]);

  // Typing animation for feature content
  useEffect(() => {
    setTypedContent("");
    setIsTyping(true);
    const content = selectedFeature.content;
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex < content.length) {
        setTypedContent(content.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 15); // Typing speed - adjust for faster/slower

    return () => {
      clearInterval(typingInterval);
      setIsTyping(false);
    };
  }, [selectedFeature]);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header/Nav */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-[2px] border-b border-border/40">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo image + Logo title */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="h-10 w-10 rounded-full bg-white dark:bg-white p-1 flex items-center justify-center">
              <Image
                src="/what-the-stack-logo.png"
                alt="what-the-tech logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg font-semibold text-foreground">
              what-the-tech
            </span>
          </button>

          {/* Right: About link + Features link + Theme toggle + Auth section */}
          <div className="flex items-center gap-4">
            <a
              href="#about"
              className="text-sm text-foreground transition-colors hover:text-muted-foreground"
            >
              About
            </a>
            <a
              href="#features"
              className="text-sm text-foreground transition-colors hover:text-muted-foreground"
            >
              Features
            </a>
            <ThemeToggle />
            {loading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : user ? (
              <ProfileDropdown userProfile={userProfile} />
            ) : (
              <Link href="/signin">
                <Button variant="default" size="default">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center justify-start px-4 pt-0 pb-8 sm:px-6 sm:pt-0 sm:pb-12 lg:px-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          {/* Logo image */}
          <div className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 rounded-full bg-white dark:bg-white p-2 sm:p-2.5 lg:p-3 flex items-center justify-center">
            <Image
              src="/what-the-stack-logo.png"
              alt="what-the-tech logo"
              width={96}
              height={96}
              className="h-full w-full object-contain"
            />
          </div>
          {/* Logo title */}
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            what-the-tech
          </h1>

          {/* Subtitle/slogan */}
          <p className="text-lg text-muted-foreground sm:text-xl">
            Ever wondered{" "}
            <span className="italic line-through font-bold">what the heck</span>{" "}
            <span className="animate-fade-color font-bold">what the tech</span> is behind
            a project on Github?
          </p>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Convert GitHub repositories into explorable knowledge hubs with AI
          </p>

          {/* GitHub repo URL input (Primary CTA) */}
          <div className="relative w-full max-w-lg">
            {/* No Signup Required Badge */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-md border border-primary/20 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                No Sign Up Required
              </div>
            </div>
            
            <Card className="w-full border-2 shadow-lg animate-border-glow py-4 gap-4">
              <CardContent className="p-4">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    type="text"
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setError(null);
                    }}
                    onKeyPress={handleKeyPress}
                    className="flex-1 border-2 border-border"
                    disabled={isLoading}
                  />
                  <Button
                    size="default"
                    className="w-full sm:w-auto"
                    onClick={handleAnalyze}
                    disabled={isLoading || !repoUrl.trim()}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">
                          {loadingSteps[loadingStep]?.label || "Processing"}...
                        </span>
                        <span className="sm:hidden">Processing...</span>
                      </div>
                    ) : (
                      "Analyze Repository"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Progress Indicator */}
            {isLoading && (
              <Card className="mt-4 w-full max-w-lg border-2 bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-4">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">Processing repository</span>
                      <span className="font-semibold text-primary">
                        {Math.round(((loadingStep + 1) / loadingSteps.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{
                          width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    {loadingSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = index === loadingStep;
                      const isCompleted = index < loadingStep;
                      const isPending = index > loadingStep;
                      
                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                            isActive
                              ? "border-primary/50 bg-primary/5 shadow-sm"
                              : isCompleted
                              ? "border-primary/30 bg-primary/5"
                              : "border-border bg-background opacity-60"
                          )}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                              isCompleted
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : isActive
                                ? "border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/20 animate-pulse"
                                : "border-border bg-muted text-muted-foreground"
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isActive ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <StepIcon className="h-4 w-4" />
                            )}
                          </div>

                          {/* Label */}
                          <div className="flex-1">
                            <p
                              className={cn(
                                "text-sm font-medium transition-colors",
                                isActive && "text-primary",
                                isCompleted && "text-primary/80",
                                isPending && "text-muted-foreground"
                              )}
                            >
                              {step.label}
                            </p>
                            {isActive && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                This may take a few moments...
                              </p>
                            )}
                          </div>

                          {/* Status Indicator */}
                          {isCompleted && (
                            <div className="text-xs font-medium text-primary">Done</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Floating Error Alert - Positioned at bottom of card area */}
            {error && (
              <div
                className={cn(
                  "absolute -bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-start gap-2 rounded-lg border border-destructive/50 bg-card shadow-lg px-4 py-3 text-sm transition-all duration-300 max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-xl",
                  isErrorVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                )}
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <span className="text-destructive font-bold break-words min-w-0">{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-bold text-foreground">About</h2>
          <div className="mb-12 space-y-4 text-muted-foreground">
            <p className="text-base leading-relaxed">
              <strong className="text-foreground">what-the-tech</strong> transforms any GitHub repository into an interactive
              knowledge hub powered by AI. Explore codebases through intelligent chat conversations
              and visual architecture diagrams, all without needing to clone or manually navigate repositories.
            </p>
            <p className="text-base leading-relaxed">
              Our <strong className="text-foreground">Agent</strong> provides chatbox conversations powered by Google Gemini AI,
              answering questions about your codebase with citations from actual code files. Every response
              is grounded in your repository's content using RAG (Retrieval Augmented Generation), ensuring
              accurate and verifiable answers.
            </p>
            <p className="text-base leading-relaxed">
              The <strong className="text-foreground">Board</strong> visualizes your project structure using interactive Mermaid diagrams,
              generated from comprehensive codebase analysis. Toggle between rendered visualizations and raw
              Mermaid code to understand architecture, data flows, and component relationships at a glance.
            </p>
            <p className="text-base leading-relaxed">
              Built for developers who want to understand codebases faster, onboard new team members efficiently,
              explore open-source projects with confidence, and get instant answers about any repository's structure
              and implementation.
            </p>
          </div>

          {/* Example Questions Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Example Question 1 - Yellow */}
            <Card className="p-4 text-center transition-all duration-200 hover:border-yellow-500/50">
              <CardHeader className="p-0 pb-2">
                <div className="mb-3 flex justify-center">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-mono">Project Overview</CardTitle>
              </CardHeader>
              <CardDescription className="text-sm leading-relaxed italic font-mono">
                "Give me a high-level overview of this project"
              </CardDescription>
            </Card>

            {/* Example Question 2 - Blue */}
            <Card className="p-4 text-center transition-all duration-200 hover:border-blue-500/50">
              <CardHeader className="p-0 pb-2">
                <div className="mb-3 flex justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-mono">Tech Stack Analysis</CardTitle>
              </CardHeader>
              <CardDescription className="text-sm leading-relaxed italic font-mono">
                "What is the tech stack?"
              </CardDescription>
            </Card>

            {/* Example Question 3 - Green */}
            <Card className="p-4 text-center transition-all duration-200 hover:border-green-500/50">
              <CardHeader className="p-0 pb-2">
                <div className="mb-3 flex justify-center">
                  <Network className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-mono">API Integration</CardTitle>
              </CardHeader>
              <CardDescription className="text-sm leading-relaxed italic font-mono">
                "What are the specific APIs being called?"
              </CardDescription>
            </Card>

            {/* Example Question 4 - Purple */}
            <Card className="p-4 text-center transition-all duration-200 hover:border-purple-500/50">
              <CardHeader className="p-0 pb-2">
                <div className="mb-3 flex justify-center">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-mono">Business Flow</CardTitle>
              </CardHeader>
              <CardDescription className="text-sm leading-relaxed italic font-mono">
                "What is the login authentication flow?"
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-left text-3xl font-bold text-foreground">
            Features
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[300px_1fr] lg:items-stretch">
            {/* Sidebar - Feature Selection */}
            <div className="flex flex-col gap-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                const isSelected = selectedFeature.id === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setSelectedFeature(feature)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:bg-accent",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={cn(
                          "mb-1 font-semibold font-mono",
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {feature.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Content Box - Selected Feature Details */}
            <Card className="flex h-full flex-col">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  {(() => {
                    const Icon = selectedFeature.icon;
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
                <CardTitle className="text-2xl font-mono">{selectedFeature.title}</CardTitle>
                <CardDescription className="text-base font-mono">
                  {selectedFeature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed font-mono">
                  {typedContent}
                  {isTyping && <span className="animate-pulse">|</span>}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 border-t border-border bg-card">
        <div className="container mx-auto flex min-h-20 items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          {/* Left: Logo + Text + Copyright */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white dark:bg-white p-1 flex items-center justify-center">
              <Image
                src="/what-the-stack-logo.png"
                alt="what-the-tech logo"
                width={40}
                height={40}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground">
                what-the-tech
              </span>
              <span className="text-sm text-foreground">
                © 2026
              </span>
            </div>
          </div>

          {/* Acknowledgements - Bottom Right */}
          <div className="flex flex-col items-end gap-5 text-right">
            <div className="flex flex-col items-end gap-2">
              <Image
                src="/uottahack8.png"
                alt="uOttaHack 8"
                width={120}
                height={120}
                className="h-auto w-20 opacity-90"
              />
              <p className="text-xs text-foreground">
                <span className="text-foreground">Built For </span>
                <span className="font-semibold text-foreground">uOttaHack 8</span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Image
                src="/Google_Gemini_logo.png"
                alt="Google Gemini AI"
                width={150}
                height={150}
                className="h-auto w-16 opacity-90"
              />
              <p className="text-xs text-foreground">
                <span className="text-foreground">Powered By </span>
                <span className="font-semibold text-foreground">Google Gemini AI</span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Image
                src="/mlh-logo.png"
                alt="Major League Hacking"
                width={150}
                height={150}
                className="h-auto w-16 opacity-90"
              />
              <p className="text-xs text-foreground">
                <span className="text-foreground">Supported By </span>
                <span className="font-semibold text-foreground">Major League Hacking (MLH)</span>
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
