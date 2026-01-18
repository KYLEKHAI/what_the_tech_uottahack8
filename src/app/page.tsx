"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { Sparkles, Zap, Layers, Shield, MessageSquare, GitBranch, Code, AlertCircle, Loader2, CheckCircle2, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserProfile } from "@/lib/supabase";

const features = [
  {
    id: 1,
    title: "Agent Chat",
    icon: MessageSquare,
    description: "ChatGPT-like conversations grounded in repository context",
    content: "Ask questions about your codebase and get intelligent answers with citations from actual code. Our AI agent understands your repository structure and provides accurate, context-aware responses.",
  },
  {
    id: 2,
    title: "Mermaid Board",
    icon: GitBranch,
    description: "Visual architecture diagrams with rendered and code views",
    content: "Explore your repository structure through interactive Mermaid diagrams. Toggle between rendered visualizations and raw Mermaid code to understand your project's architecture at a glance.",
  },
  {
    id: 3,
    title: "RAG-Powered",
    icon: Sparkles,
    description: "Retrieval augmented generation for accurate responses",
    content: "Our system uses vector search to retrieve relevant code chunks and provides grounded answers. No hallucinations—every response is backed by actual repository content.",
  },
  {
    id: 4,
    title: "Code Analysis",
    icon: Code,
    description: "Deep repository analysis with symbol-level understanding",
    content: "We analyze your entire codebase, extracting functions, classes, and relationships. Get insights into how components connect and interact within your project.",
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
  const router = useRouter();
  const { setCurrentRepoUrl, addProject } = useDashboardStore();
  const { user, loading } = useAuth();

  const loadingSteps = [
    { label: "Validating repository", icon: CheckCircle2 },
    { label: "Cloning repository", icon: GitBranch },
    { label: "Analyzing codebase", icon: FileCode },
    { label: "Generating context", icon: Sparkles },
  ];

  // Fetch user profile when user is authenticated
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
    } else {
      setUserProfile(null);
    }
  }, [user]);

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

  const downloadXML = (xmlContent: string, repoName: string) => {
    const blob = new Blob([xmlContent], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoName}-repomix.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      const response = await fetch("/api/projects/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        const projectId = `${data.data.repoInfo.owner}-${data.data.repoInfo.name}-${Date.now()}`;
        
        // Download XML file
        if (data.data.xmlContent) {
          downloadXML(data.data.xmlContent, repoName);
        }

        // Add project to store and select it (this also sets currentRepoUrl)
        addProject({
          id: projectId,
          name: data.data.repoInfo.name,
          repoUrl: `${data.data.repoInfo.owner}/${data.data.repoInfo.name}`,
          owner: data.data.repoInfo.owner,
          repo: data.data.repoInfo.name,
          status: "ready",
        });

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
            <Image
              src="/what-the-stack-logo.png"
              alt="what-the-tech logo"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <span className="text-lg font-semibold text-foreground">
              what-the-tech
            </span>
          </button>

          {/* Right: About link + Features link + Auth section */}
          <div className="flex items-center gap-6">
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
          <Image
            src="/what-the-stack-logo.png"
            alt="what-the-tech logo"
            width={112}
            height={112}
            className="h-28 w-28 sm:h-36 sm:w-36 lg:h-44 lg:w-44"
          />
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
          <div className="relative w-full max-w-lg overflow-visible">
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
              what-the-tech transforms any GitHub repository into an interactive
              knowledge hub. Explore codebases through intelligent chat and
              visual architecture diagrams.
            </p>
            <p className="text-base leading-relaxed">
              Our Agent provides ChatGPT-like conversations grounded in your
              repository context, answering questions with citations from actual
              code. The Board visualizes your project structure using Mermaid
              diagrams, giving you both rendered views and raw code.
            </p>
            <p className="text-base leading-relaxed">
              Built for developers who want to understand codebases faster,
              onboard new team members efficiently, and explore open-source
              projects with confidence.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Feature 1</CardTitle>
                <CardDescription>
                  Placeholder description for feature 1. This feature provides
                  essential functionality.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Feature 2</CardTitle>
                <CardDescription>
                  Placeholder description for feature 2. This feature enhances
                  user experience.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Feature 3</CardTitle>
                <CardDescription>
                  Placeholder description for feature 3. This feature improves
                  productivity.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Feature 4</CardTitle>
                <CardDescription>
                  Placeholder description for feature 4. This feature ensures
                  reliability.
                </CardDescription>
              </CardHeader>
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
                          "mb-1 font-semibold",
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  {(() => {
                    const Icon = selectedFeature.icon;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <CardTitle className="text-2xl">{selectedFeature.title}</CardTitle>
                <CardDescription className="text-base">
                  {selectedFeature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedFeature.content}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 border-t border-border bg-card">
        <div className="container mx-auto flex min-h-32 items-start justify-start px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/what-the-stack-logo.png"
                alt="what-the-tech logo"
                width={48}
                height={48}
                className="h-12 w-12"
              />
              <span className="text-lg font-semibold text-foreground">
                what-the-tech
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2026
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
