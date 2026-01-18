"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Github, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";

const normalizeMarkdown = (content: string) => {
  // Normalize line endings
  let text = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Remove inline code and code blocks
  text = text
    // Remove inline code (`code`) - replace with just the text
    .replace(/`([^`]+)`/g, "$1")
    // Remove code blocks (```code```) - remove entirely
    .replace(/```[\s\S]*?```/g, "");
  
  // Split by double newlines (paragraph breaks) first
  const paragraphs = text.split(/\n\n+/);
  const normalized: string[] = [];

  const isBlockElement = (line: string) => {
    const trimmed = line.trim();
    return (
      /^#{1,6}\s+/.test(trimmed) ||      // Headers
      /^[-*+]\s+/.test(trimmed) ||       // Bullet lists
      /^\d+\.\s+/.test(trimmed) ||       // Numbered lists
      /^>\s+/.test(trimmed) ||           // Blockquotes
      /^---+$/.test(trimmed)             // Horizontal rules
    );
  };

  for (const para of paragraphs) {
    const lines = para.split("\n");
    const blockElements: string[] = [];
    let currentText: string[] = [];

    const flushText = () => {
      if (currentText.length > 0) {
        const joined = currentText.join(" ").replace(/\s+/g, " ").trim();
        if (joined) {
          blockElements.push(joined);
        }
        currentText = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Empty line - skip
      if (!trimmed) {
        continue;
      }

      // Block-level elements - flush text and add as-is
      if (isBlockElement(trimmed)) {
        flushText();
        blockElements.push(line);
      } else {
        // Everything else - add to current paragraph
        // This ensures file paths like "skills/" get collapsed into the paragraph
        currentText.push(trimmed);
      }
    }

    flushText();
    
    if (blockElements.length > 0) {
      normalized.push(blockElements.join("\n"));
    }
  }

  return normalized.join("\n\n");
};

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
  
  // Local messages for non-signed-in users (temporary, cleared on session end)
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    created_at: string;
  }>>([]);
  
  // Get state and actions from dashboard store
  const currentRepoUrl = useDashboardStore((state) => state.currentRepoUrl);
  const projects = useDashboardStore((state) => state.projects);
  const selectedProjectId = useDashboardStore((state) => state.selectedProjectId);
  
  // Database messages for signed-in users
  const [databaseMessages, setDatabaseMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    created_at: string;
  }>>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  
  // Use database messages if signed in, local messages if not
  const displayMessages = isSignedIn ? databaseMessages : localMessages;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages when project changes (for signed-in users only)
  const loadChatMessages = async (projectId: string) => {
    if (!isSignedIn) return;
    
    console.log('📋 Loading chat messages for project:', projectId);
    setIsLoadingMessages(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ No access token available for chat API');
        setIsLoadingMessages(false);
        return;
      }

      const response = await fetch(`/api/chat?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Failed to load chat messages:', response.status, errorData);
        setIsLoadingMessages(false);
        return;
      }

      const result = await response.json();
      console.log('✅ Loaded chat messages:', result.messages?.length || 0);
      
      setDatabaseMessages(result.messages || []);
      setIsLoadingMessages(false);
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      setIsLoadingMessages(false);
    }
  };

  // Add message to database (for signed-in users only)
  const addChatMessage = async (projectId: string, content: string, role: 'user' | 'assistant' | 'system') => {
    if (!isSignedIn) return;
    
    console.log('💬 Adding chat message to project:', projectId, 'Role:', role);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ No access token available for chat API');
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId,
          message: content,
          role
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Failed to add chat message:', response.status, errorData);
        return;
      }

      const result = await response.json();
      console.log('✅ Added chat message:', result.message?.id);
      
      // Add the message to local state
      setDatabaseMessages(prev => [...prev, {
        id: result.message.id,
        content: content,
        role: role,
        created_at: result.message.created_at
      }]);
    } catch (error) {
      console.error('❌ Error adding chat message:', error);
    }
  };

  useEffect(() => {
    if (selectedProjectId && isSignedIn) {
      console.log('📋 Loading chat messages for project:', selectedProjectId);
      loadChatMessages(selectedProjectId);
    }
  }, [selectedProjectId, isSignedIn]);

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
  }, [displayMessages]);

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

  // Generate AI response (shared by both signed-in and non-signed-in users)
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // Get session token for signed-in users
      let authHeaders = {};
      if (isSignedIn && user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders = { 'Authorization': `Bearer ${session.access_token}` };
        }
      }

      // Try to get project XML - from database for signed-in users, localStorage for guests
      let projectXML = null;
      if (selectedProjectId) {
        if (isSignedIn) {
          // Signed-in users: fetch XML from database
          try {
            console.log('🔍 Fetching XML from database for signed-in user, project:', selectedProjectId);
            const xmlResponse = await fetch(`/api/projects/${selectedProjectId}/xml`, {
              headers: authHeaders
            });
            
            if (xmlResponse.ok) {
              const xmlData = await xmlResponse.json();
              projectXML = xmlData.xmlContent;
              
              // Enhanced XML validation
              if (projectXML && projectXML.trim().length > 0) {
                const cleanXML = projectXML.trim();
                console.log('✅ Database XML Content Loaded:', {
                  length: cleanXML.length,
                  hasStructure: cleanXML.includes('<') && cleanXML.includes('>'),
                  preview: cleanXML.substring(0, 150) + (cleanXML.length > 150 ? '...' : ''),
                  isEmpty: cleanXML.length === 0
                });
                
                if (cleanXML.length < 100) {
                  console.warn('⚠️ XML content seems very minimal, might not contain full project structure');
                }
              } else {
                console.warn('⚠️ Database XML response received but content is empty or null');
                projectXML = null;
              }
            } else {
              console.warn('⚠️ Could not load project XML from database:', xmlResponse.status);
              const errorText = await xmlResponse.text();
              console.warn('⚠️ XML Error response:', errorText);
            }
          } catch (xmlError) {
            console.warn('⚠️ Error loading project XML from database:', xmlError);
          }
        } else {
          // Non-signed-in users: get XML from localStorage
          try {
            console.log('🔍 Fetching XML from localStorage for guest user, project:', selectedProjectId);
            const localXMLKey = `what-the-tech-xml-${selectedProjectId}`;
            const storedXML = localStorage.getItem(localXMLKey);
            
            if (storedXML && storedXML.trim().length > 0) {
              projectXML = storedXML.trim();
              console.log('✅ Local XML Content Loaded:', {
                length: projectXML.length,
                hasStructure: projectXML.includes('<') && projectXML.includes('>'),
                preview: projectXML.substring(0, 150) + (projectXML.length > 150 ? '...' : ''),
                source: 'localStorage'
              });
              
              if (projectXML.length < 100) {
                console.warn('⚠️ Local XML content seems very minimal, might not contain full project structure');
              }
            } else {
              console.warn('⚠️ No XML found in localStorage for project:', selectedProjectId);
              console.warn('⚠️ Available localStorage keys:', Object.keys(localStorage).filter(key => key.includes('xml')));
            }
          } catch (localError) {
            console.warn('⚠️ Error accessing localStorage for XML:', localError);
          }
        }
      } else {
        console.log('⚠️ No project selected, cannot fetch XML');
      }

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          message: userMessage,
          projectXML,
          chatHistory: displayMessages.slice(-5), // Send last 5 messages for context
          userId: user?.id,
          isSignedIn
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        
        // Provide helpful error messages
        if (response.status === 429) {
          return "I'm currently handling many requests. Please try again in a moment.";
        } else if (response.status === 401) {
          return "Authentication issue. Please try signing in again.";
        } else {
          return "I'm having trouble connecting right now. Please try again.";
        }
      }

      const data = await response.json();
      return data.response || "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.";
      
    } catch (error) {
      console.error('❌ Error calling Gemini API:', error);
      return "I'm experiencing technical difficulties. Please try again in a moment.";
    }
  };

  const handleSend = async (question?: string) => {
    const questionText = question || input.trim();
    if (!questionText || isLoadingAI) return;

    // Check if user has any projects - if not, don't allow sending
    if (projects.length === 0) {
      return;
    }

    // For signed-in users, check if a project is selected
    if (isSignedIn && !selectedProjectId) {
      return;
    }

    setInput("");
    setIsLoadingAI(true);

    if (isSignedIn) {
      // Database storage for signed-in users
      // selectedProjectId is guaranteed to be non-null here due to earlier check
      if (!selectedProjectId) {
        setIsLoadingAI(false);
        return;
      }

      try {
        // Add user message to database
        console.log('💬 Sending user message to database...');
        await addChatMessage(selectedProjectId, questionText, 'user');

        // Generate AI response and add to database
        console.log('🤖 Generating AI response...');
        const assistantResponse = await generateAIResponse(questionText);
        console.log('🤖 Adding assistant response to database...');
        await addChatMessage(selectedProjectId, assistantResponse, 'assistant');
      } catch (error) {
        console.error('❌ Error sending message:', error);
      } finally {
        setIsLoadingAI(false);
      }
    } else {
      // Local storage for non-signed-in users (temporary messages)
      console.log('💬 Adding message to local storage (temporary)...');
      
      const userMessage = {
        id: Date.now().toString(),
        content: questionText,
        role: 'user' as const,
        created_at: new Date().toISOString()
      };

      setLocalMessages(prev => [...prev, userMessage]);

      try {
        // Generate AI response and add to local storage
        console.log('🤖 Generating AI response...');
        const assistantResponse = await generateAIResponse(questionText);
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          content: assistantResponse,
          role: 'assistant' as const,
          created_at: new Date().toISOString()
        };
        setLocalMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        console.error('❌ Error generating AI response:', error);
      } finally {
        setIsLoadingAI(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLocked = projects.length === 0 || (isSignedIn && !selectedProjectId);

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Blur overlay when locked */}
      {isLocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-[2px] pointer-events-none">
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-foreground/30 bg-card/95 px-8 py-6 shadow-xl pointer-events-auto">
            <div className="rounded-full bg-foreground/10 p-4">
              <Lock className="h-8 w-8 text-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              Add repo before asking AI
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Please add a repository to start chatting with the AI agent
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex h-14 items-center border-b border-border bg-card px-6">
        <h2 className="text-lg font-semibold text-foreground">Agent</h2>
      </div>

      {/* Messages Container */}
      <div className={cn("flex-1 overflow-y-auto p-4", isLocked && "blur-[1px] pointer-events-none opacity-70")}>
        <div className="mx-auto w-full max-w-5xl h-full">
          {displayMessages.length === 0 ? (
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
                        disabled={isLocked}
                        className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {displayMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <Card
                    className={cn(
                      "max-w-[95%] p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-card-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="text-sm leading-relaxed">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Custom styling for markdown elements
                            h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-4 mt-6 block first:mt-0" {...props} />,
                            h2: ({node, ...props}: any) => <h2 className="text-base font-semibold mb-3 mt-5 block first:mt-0" {...props} />,
                            h3: ({node, ...props}: any) => <h3 className="text-sm font-medium mb-2 mt-4 block first:mt-0" {...props} />,
                            p: ({node, ...props}: any) => <p className="mb-3 block whitespace-normal break-words" {...props} />,
                            ul: ({node, ...props}: any) => <ul className="mb-4 ml-6 list-disc block space-y-1" {...props} />,
                            ol: ({node, ...props}: any) => <ol className="mb-4 ml-6 list-decimal block space-y-1" {...props} />,
                            li: ({node, ...props}: any) => <li className="mb-1.5 block" {...props} />,
                            code: ({node, ...props}: any) => {
                              // Don't render code at all - return empty
                              return null;
                            },
                            pre: ({node, ...props}: any) => {
                              // Don't render code blocks at all - return empty
                              return null;
                            },
                            hr: ({node, ...props}: any) => <hr className="my-6 border-border block" {...props} />,
                            br: ({node, ...props}: any) => <br className="block" {...props} />,
                            strong: ({node, ...props}: any) => <strong className="font-semibold" {...props} />,
                            em: ({node, ...props}: any) => <em className="italic" {...props} />,
                            blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-muted pl-4 my-3 italic block" {...props} />,
                          }}
                        >
                          {normalizeMarkdown(message.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Card>
                </div>
              ))}
              
              {/* AI Typing Indicator */}
              {isLoadingAI && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-3 bg-card text-card-foreground">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </Card>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          {/* Input Field Row - Blurred when locked */}
          <div className={cn("flex items-center gap-3", isLocked && "pointer-events-none blur-[1px] opacity-70 pointer-events-none")}>
            {/* Input Field */}
            <Input
              type="text"
              placeholder="Ask anything about the repo"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 rounded-lg border-2 border-border focus-visible:border-ring"
              disabled={isLoadingAI || isLocked}
            />

            {/* Send Button */}
            <Button
              onClick={() => handleSend()}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              disabled={isLoadingAI || !input.trim() || isLocked}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Knowledge Base Indicator - Not blurred or locked */}
          <div className={cn("relative z-[60]", showAddRepoModal && "z-[40]")}>
            {showAddRepo ? (
              <button
                onClick={handleAddRepoClick}
                className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 pt-1 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 hover:border-green-500/50 transition-colors"
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
      </div>

      {/* Add Repo Confirmation Modal */}
      {showAddRepoModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
