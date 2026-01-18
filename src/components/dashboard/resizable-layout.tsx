"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { AgentChat } from "./agent-chat";
import { BoardPanel } from "./board-panel";
import { useDashboardStore } from "@/lib/stores/dashboard-store";

export function ResizableLayout() {
  const isBoardCollapsed = useDashboardStore((state) => state.isBoardCollapsed);

  return (
    <Group orientation="horizontal" className="h-full">
      {/* Agent Chat Panel */}
      <Panel 
        defaultSize={isBoardCollapsed ? 96 : 60} 
        minSize={30} 
        collapsible={false}
      >
        <AgentChat />
      </Panel>

      {/* Resize Handle - Only show when board is not collapsed */}
      {!isBoardCollapsed && (
        <Separator className="w-px bg-border/50 hover:bg-border transition-colors" />
      )}

      {/* Board Panel - Use key to force re-render when collapsed state changes */}
      <Panel 
        key={isBoardCollapsed ? "collapsed" : "expanded"}
        defaultSize={isBoardCollapsed ? 4 : 40} 
        minSize={isBoardCollapsed ? 4 : 30}
        collapsible={false}
      >
        <BoardPanel />
      </Panel>
    </Group>
  );
}
