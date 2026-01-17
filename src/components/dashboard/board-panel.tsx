"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export function BoardPanel() {
  return (
    <div className="flex h-full flex-col bg-background">
      <Tabs defaultValue="board" className="flex h-full flex-col">
        {/* Tab Headers */}
        <div className="border-b border-border bg-card p-4">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
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
    </div>
  );
}
