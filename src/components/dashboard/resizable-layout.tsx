"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { AgentChat } from "./agent-chat";
import { BoardPanel } from "./board-panel";

export function ResizableLayout() {
  return (
    <Group orientation="horizontal" className="h-full">
      {/* Agent Chat Panel */}
      <Panel defaultSize={60} minSize={30}>
        <AgentChat />
      </Panel>

      {/* Resize Handle */}
      <Separator className="w-1 bg-border hover:bg-primary/20 transition-colors" />

      {/* Board Panel */}
      <Panel defaultSize={40} minSize={30}>
        <BoardPanel />
      </Panel>
    </Group>
  );
}
