"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Code, ChevronRight, ChevronLeft } from "lucide-react";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { cn } from "@/lib/utils";

export function BoardPanel() {
  const { isBoardCollapsed, toggleBoard } = useDashboardStore();

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background overflow-hidden transition-all duration-300">
      {isBoardCollapsed ? (
        <div className="flex h-full w-full flex-col">
          {/* Collapsed Header */}
          <div className="flex h-14 items-center justify-end border-b border-border bg-card flex-shrink-0 px-3 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBoard}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          {/* Collapsed Icons */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              <Code className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="board" className="flex h-full flex-col">
          {/* Tab Headers */}
          <div className="flex h-14 items-center justify-center border-b border-border bg-card px-6 relative flex-shrink-0">
            <TabsList>
              <TabsTrigger 
                value="board" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
                Board
              </TabsTrigger>
              <TabsTrigger 
                value="code" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Code className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBoard}
              className="h-8 w-8 absolute right-3 top-1/2 -translate-y-1/2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Board Tab - Placeholder for Mermaid diagram */}
          <TabsContent value="board" className="flex-1 overflow-auto p-4 m-0">
            <div className="flex h-full items-center justify-center">
              <Card className="w-full max-w-md p-8 text-center">
                <p className="text-muted-foreground">
                  Mermaid diagram will render here
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The visual architecture diagram will appear in this area once
                  Mermaid integration is complete.
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Code Tab - Placeholder for raw Mermaid code */}
          <TabsContent value="code" className="flex-1 overflow-auto p-4 m-0">
            <div className="flex h-full items-center justify-center">
              <Card className="w-full max-w-md p-8 text-center">
                <p className="font-mono text-muted-foreground">
                  Raw Mermaid code will appear here
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The raw Mermaid code will be displayed here using JetBrains
                  Mono font.
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
