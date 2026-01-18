"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/lib/stores/dashboard-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Preset question bubbles
const presetQuestions = [
  "What is this project about?",
  "How does the authentication work?",
  "What are the key dependencies?",
  "How is the project structured?",
];

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const currentRepoUrl = useDashboardStore((state) => state.currentRepoUrl);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract repo name from URL (e.g., "owner/repo" from "https://github.com/owner/repo")
  const getRepoName = () => {
    if (!currentRepoUrl) return "knowledge_base";
    try {
      const url = new URL(currentRepoUrl);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        return `${pathParts[0]}/${pathParts[1]}`;
      }
      return "knowledge_base";
    } catch {
      return currentRepoUrl.replace("https://github.com/", "").replace("http://github.com/", "") || "knowledge_base";
    }
  };

  const repoName = getRepoName();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (question?: string) => {
    const questionText = question || input.trim();
    if (!questionText) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: questionText,
    };

    setMessages([...messages, newMessage]);
    setInput("");

    // Simulate assistant response (mock)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a placeholder response. RAG integration will be added later.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
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
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-6 h-full min-h-[400px]">
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
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {messages.map((message) => (
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Github className="h-4 w-4" />
            <span className="font-medium">{repoName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
