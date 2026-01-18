"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Github, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";

// Preset question bubbles
const presetQuestions = [
  "What is this project about?",
  "How does the authentication work?",
  "What are the key dependencies?",
  "How is the project structured?",
];

export function AgentChat() {
  const router = useRouter();
  const { user } = useAuth();
  const isSignedIn = !!user;
  const [input, setInput] = useState("");
  const [showAddRepoModal, setShowAddRepoModal] = useState(false);
  
  // Get state and actions from dashboard store
  const currentRepoUrl = useDashboardStore((state) => state.currentRepoUrl);
  const projects = useDashboardStore((state) => state.projects);
  const selectedProjectId = useDashboardStore((state) => state.selectedProjectId);
  const chatMessages = useDashboardStore((state) => state.chatMessages);
  const isLoadingMessages = useDashboardStore((state) => state.isLoadingMessages);
  const loadChatMessages = useDashboardStore((state) => state.loadChatMessages);
  const addChatMessage = useDashboardStore((state) => state.addChatMessage);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages when project changes
  useEffect(() => {
    if (selectedProjectId && isSignedIn) {
      console.log('📋 Loading chat messages for project:', selectedProjectId);
      loadChatMessages(selectedProjectId);
    }
  }, [selectedProjectId, isSignedIn, loadChatMessages]);

  // Validate token on user sign-in
  useEffect(() => {
    if (user) {
      console.log('👤 User signed in, checking token status...');
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          console.log('✅ Valid access token found for user:', user.email);
          console.log('🔑 Token length:', session.access_token.length);
          console.log('⏰ Token expires at:', new Date(session.expires_at! * 1000).toLocaleString());
        } else {
          console.log('❌ No access token found');
        }
      });
    }
  }, [user]);

  // Extract repo name from URL (e.g., "owner/repo" from "https://github.com/owner/repo")
  const getRepoName = () => {
    if (!currentRepoUrl) {
      // If signed in and no projects, show "add repo"
      if (isSignedIn && projects.length === 0) {
        return "add repo";
      }
      return "knowledge_base";
    }
    try {
      const url = new URL(currentRepoUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        return `${pathParts[0]}/${pathParts[1]}`;
      }
      return isSignedIn && projects.length === 0 ? "add repo" : "knowledge_base";
    } catch {
      const cleaned = currentRepoUrl.replace("https://github.com/", "").replace("http://github.com/", "");
      return cleaned || (isSignedIn && projects.length === 0 ? "add repo" : "knowledge_base");
    }
  };

  const repoName = getRepoName();
  const showAddRepo = isSignedIn && projects.length === 0 && !currentRepoUrl;

  const handleAddRepoClick = () => {
    setShowAddRepoModal(true);
  };

  const handleConfirmAddRepo = () => {
    setShowAddRepoModal(false);
    router.push("/");
  };

  const handleCancelAddRepo = () => {
    setShowAddRepoModal(false);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Check and log token status when user signs in
  useEffect(() => {
    const checkTokenStatus = async () => {
      if (isSignedIn && user) {
        console.log('🔍 Checking token status for authenticated user...');
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Error getting session:', error);
            return;
          }

          if (session?.access_token) {
            console.log('🎯 TOKEN STATUS CHECK - User has VALID token:', {
              userEmail: user.email,
              userId: user.id,
              tokenPresent: true,
              tokenLength: session.access_token.length,
              tokenStart: session.access_token.substring(0, 15) + '...',
              tokenEnd: '...' + session.access_token.slice(-10),
              expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
              timeUntilExpiry: Math.round((session.expires_at! * 1000 - Date.now()) / (1000 * 60)) + ' minutes',
              refreshTokenPresent: !!session.refresh_token
            });

            // Test the token by making a simple authenticated request
            const { data: testUser, error: testError } = await supabase.auth.getUser();
            if (testError) {
              console.log('⚠️ Token validation failed:', testError);
            } else if (testUser.user) {
              console.log('✅ TOKEN VALIDATION SUCCESS - Token is working properly!', {
                validatedUser: testUser.user.email,
                lastSignIn: testUser.user.last_sign_in_at
              });
            }
          } else {
            console.log('❌ User appears signed in but no access token found');
          }
        } catch (error) {
          console.error('❌ Error checking token status:', error);
        }
      } else if (isSignedIn === false) {
        console.log('🚫 User is not signed in - no token to check');
      }
    };

    checkTokenStatus();
  }, [isSignedIn, user]);

  const handleSend = async (question?: string) => {
    const questionText = question || input.trim();
    if (!questionText) return;

    if (!selectedProjectId) {
      console.error('❌ No project selected for chat');
      return;
    }

    if (!isSignedIn) {
      console.error('❌ User must be signed in to send messages');
      return;
    }

    setInput("");

    try {
      // Add user message to database
      console.log('💬 Sending user message...');
      await addChatMessage(selectedProjectId, questionText, 'user');

      // Simulate assistant response (mock for now - will be replaced with actual AI later)
      setTimeout(async () => {
        const assistantResponse = "This is a placeholder response. RAG integration will be added later.";
        console.log('🤖 Adding assistant response...');
        await addChatMessage(selectedProjectId, assistantResponse, 'assistant');
      }, 1000);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-border bg-card px-6">
        <h2 className="text-lg font-semibold text-foreground">Agent</h2>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-5xl h-full">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-6 h-full min-h-[400px]">
              {/* Loading state */}
              {isLoadingMessages ? (
                <p className="text-lg font-medium text-muted-foreground">
                  Loading messages...
                </p>
              ) : (
                <>
                  {/* "Ask a question" text */}
                  <p className="text-lg font-medium text-muted-foreground">
                    Ask a question
                  </p>

                  {/* Preset question bubbles */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {presetQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(question)}
                        className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <Card
                    className={cn(
                      "max-w-[80%] p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </Card>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          {/* Input Field Row */}
          <div className="flex items-center gap-3">
            {/* Input Field */}
            <Input
              type="text"
              placeholder="How can we help?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-lg border-2 border-border focus-visible:border-ring"
            />

            {/* Send Button */}
            <Button
              onClick={() => handleSend()}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Knowledge Base Indicator */}
          {showAddRepo ? (
            <button
              onClick={handleAddRepoClick}
              className="flex items-center gap-2 text-sm text-muted-foreground pt-1 px-3 py-1.5 rounded-lg border border-border hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">{repoName}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
              <Github className="h-4 w-4" />
              <span className="font-medium">{repoName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Repo Confirmation Modal */}
      {showAddRepoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCancelAddRepo}
        >
          <Card
            className="w-full max-w-md border-2 border-primary/50 bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-center text-base font-medium text-foreground">
                Redirect to home page to add a repository?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelAddRepo}
                  className="min-w-[80px]"
                >
                  No
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirmAddRepo}
                  className="min-w-[80px]"
                >
                  Yes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
