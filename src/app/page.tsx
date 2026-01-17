"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Layers, Shield, MessageSquare, GitBranch, Code } from "lucide-react";
import { cn } from "@/lib/utils";

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

          {/* Right: About link + Features link + Sign In button */}
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
            <Link href="/signin">
              <Button variant="default" size="default">
                Sign In
              </Button>
            </Link>
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
            <span className="italic line-through">what the heck</span>{" "}
            <span className="animate-fade-color font-bold">what the tech</span> is behind
            a project on Github?
          </p>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Convert GitHub repositories into explorable knowledge hubs with AI
          </p>

          {/* GitHub repo URL input (Primary CTA) */}
          <Card className="w-full max-w-lg border-2 shadow-lg animate-border-glow py-4 gap-4">
            <CardContent className="p-4">
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Input
                  type="url"
                  placeholder="https://github.com/owner/repo"
                  className="flex-1 border-2 border-border"
                />
                <Link href="/app">
                  <Button size="lg" className="w-full sm:w-auto">
                    Analyze Repository
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
