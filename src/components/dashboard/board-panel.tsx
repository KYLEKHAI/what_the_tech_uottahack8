"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Code, ChevronRight, ChevronLeft, RefreshCw, Loader2 } from "lucide-react";
import { useDashboardStore, loadDiagramFromLocalStorage } from "@/lib/stores/dashboard-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { supabase } from "@/lib/supabase";

interface DiagramData {
  businessFlow: string | null;
  dataFlow: string | null;
  updatedAt: string | null;
}

export function BoardPanel() {
  const { isBoardCollapsed, toggleBoard, selectedProjectId } = useDashboardStore();
  const [diagramData, setDiagramData] = useState<DiagramData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("board");
  const businessFlowRef = useRef<HTMLDivElement>(null);
  const dataFlowRef = useRef<HTMLDivElement>(null);
  
  // Persist diagram data between tab switches
  const [persistedDiagrams, setPersistedDiagrams] = useState<Map<string, DiagramData>>(new Map());

  // Initialize Mermaid with minimal theme to let CSS handle colors
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base', // Use base theme with minimal styling
      themeVariables: {
        // Use transparent/minimal values instead of 'inherit'
        background: 'transparent',
        primaryColor: '#ffffff',
        primaryTextColor: '#000000',
        lineColor: '#666666',
        secondaryColor: '#f8f8f8',
        tertiaryColor: '#f0f0f0',
      },
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  // Listen for theme changes and re-render diagrams
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Theme changed, re-render diagrams
          console.log('🎨 Theme changed, re-rendering diagrams...');
          if (diagramData?.businessFlow && businessFlowRef.current) {
            renderDiagram(diagramData.businessFlow, businessFlowRef.current, 'business-flow');
          }
          if (diagramData?.dataFlow && dataFlowRef.current) {
            renderDiagram(diagramData.dataFlow, dataFlowRef.current, 'data-flow');
          }
        }
      });
    });

    // Watch for class changes on html element (theme changes)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [diagramData]);

  // Load diagram when project changes
  useEffect(() => {
    if (selectedProjectId && !isBoardCollapsed) {
      // Check if we have persisted data for this project
      const cached = persistedDiagrams.get(selectedProjectId);
      if (cached) {
        setDiagramData(cached);
      } else {
        loadDiagram();
      }
    }
  }, [selectedProjectId, isBoardCollapsed, persistedDiagrams]);

  // Render diagrams when data changes
  useEffect(() => {
    if (diagramData?.businessFlow && businessFlowRef.current) {
      renderDiagram(diagramData.businessFlow, businessFlowRef.current, 'business-flow');
    }
    if (diagramData?.dataFlow && dataFlowRef.current) {
      renderDiagram(diagramData.dataFlow, dataFlowRef.current, 'data-flow');
    }
  }, [diagramData]);

  // Re-render diagrams when switching back to board tab
  useEffect(() => {
    if (activeTab === "board" && diagramData) {
      // Small delay to ensure the tab content is visible
      const timeoutId = setTimeout(() => {
        if (diagramData.businessFlow && businessFlowRef.current) {
          renderDiagram(diagramData.businessFlow, businessFlowRef.current, 'business-flow');
        }
        if (diagramData.dataFlow && dataFlowRef.current) {
          renderDiagram(diagramData.dataFlow, dataFlowRef.current, 'data-flow');
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, diagramData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (businessFlowRef.current) {
        businessFlowRef.current.innerHTML = '';
      }
      if (dataFlowRef.current) {
        dataFlowRef.current.innerHTML = '';
      }
    };
  }, []);

  const loadDiagram = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📊 Loading diagrams for project:', selectedProjectId);
      
      // Get authentication headers (same pattern as agent-chat)
      let authHeaders = {};
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders = { 'Authorization': `Bearer ${session.access_token}` };
          console.log('🔐 Adding Authorization header to diagrams request');
        } else {
          console.log('👤 No session found, making unauthenticated request');
        }
      } catch (authError) {
        console.error('Error getting session for diagrams API:', authError);
      }
      
      const response = await fetch(`/api/projects/${selectedProjectId}/diagrams`, {
        headers: authHeaders
      });
      const data = await response.json();

      console.log('📈 Diagrams API response:', { 
        success: data.success, 
        source: data.source, 
        hasMermaidCode: !!data.mermaidCode,
        response: data 
      });

      if (response.ok && data.success) {
        if (data.source === 'localStorage') {
          // Guest user: load from localStorage
          console.log('👤 Guest user - loading diagrams from localStorage');
          const localDiagrams = loadDiagramFromLocalStorage(selectedProjectId);
          
          console.log('💾 localStorage diagrams check:', { 
            hasLocalDiagrams: !!localDiagrams, 
            localDiagrams: localDiagrams 
          });
          
          if (localDiagrams) {
            const newData: DiagramData = {
              businessFlow: localDiagrams.businessFlow || null,
              dataFlow: localDiagrams.dataFlow || null,
              updatedAt: null // localStorage doesn't track update times
            };
            setDiagramData(newData);
            // Persist in memory for tab switching
            setPersistedDiagrams(prev => new Map(prev.set(selectedProjectId, newData)));
            console.log('✅ Loaded diagrams from localStorage');
          } else {
            console.warn('⚠️ No diagrams found in localStorage for project:', selectedProjectId);
            const emptyData: DiagramData = {
              businessFlow: null,
              dataFlow: null,
              updatedAt: null
            };
            setDiagramData(emptyData);
          }
        } else {
          // Signed-in user: use data from database
          console.log('🔐 Signed-in user - using diagrams from database');
          const newData: DiagramData = {
            businessFlow: data.businessFlow || null,
            dataFlow: data.dataFlow || null,
            updatedAt: data.updatedAt
          };
          setDiagramData(newData);
          // Persist in memory for tab switching
          setPersistedDiagrams(prev => new Map(prev.set(selectedProjectId, newData)));
          console.log('✅ Diagrams loaded from database');
        }
      } else {
        throw new Error(data.error || 'Failed to load diagrams');
      }
    } catch (err) {
      console.error('❌ Error loading diagrams:', err);
      setError(err instanceof Error ? err.message : 'Failed to load diagrams');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDiagrams = async () => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🎯 Generating diagrams for project:', selectedProjectId);
      
      // Get authentication headers
      let authHeaders = {};
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders = { 'Authorization': `Bearer ${session.access_token}` };
          console.log('🔐 Adding Authorization header to generate diagrams request');
        } else {
          console.log('👤 No session found, making unauthenticated request');
        }
      } catch (authError) {
        console.error('Error getting session for generate diagrams API:', authError);
      }
      
      const response = await fetch(`/api/projects/${selectedProjectId}/generate-diagrams`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await response.json();

      console.log('🎨 Generate diagrams API response:', data);

      if (response.ok && data.success) {
        // Refresh diagram data
        await loadDiagram();
      } else {
        throw new Error(data.error || 'Failed to generate diagrams');
      }
    } catch (err) {
      console.error('❌ Error generating diagrams:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate diagrams');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDiagram = async (diagramCode: string, containerRef: HTMLDivElement, diagramType: string) => {
    if (!diagramCode || !containerRef) return;

    try {
      // Ensure the container is visible and has dimensions
      if (containerRef.offsetWidth === 0 || containerRef.offsetHeight === 0) {
        console.warn(`${diagramType} container not visible, skipping render`);
        return;
      }

      console.log(`🎨 Rendering ${diagramType} diagram...`);
      console.log(`📝 Diagram code preview:`, diagramCode.substring(0, 200) + '...');
      
      // Clear previous content completely
      containerRef.innerHTML = '';
      
      // Force a small delay to ensure clearing is complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Generate unique ID for this diagram
      const diagramId = `mermaid-${diagramType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clean the diagram code more thoroughly 
      let cleanedCode = diagramCode.trim();
      
      // Remove any remaining markdown markers
      cleanedCode = cleanedCode.replace(/^```\s*mermaid\s*\n?/gi, '');
      cleanedCode = cleanedCode.replace(/^```\s*\n?/g, '');
      cleanedCode = cleanedCode.replace(/\n?```\s*$/g, '');
      
      console.log(`🧹 Cleaned diagram code:`, cleanedCode.substring(0, 100) + '...');
      
      // Validate and render the diagram
      const isValid = await mermaid.parse(cleanedCode);
      if (isValid) {
        const { svg } = await mermaid.render(diagramId, cleanedCode);
        if (containerRef) { // Double-check ref is still valid
          containerRef.innerHTML = svg;
          
          // Remove inline styles that Mermaid adds so CSS can take over
          const svgElement = containerRef.querySelector('svg');
          if (svgElement) {
            // Remove inline styles from all elements
            const allElements = svgElement.querySelectorAll('*');
            allElements.forEach((el) => {
              // Keep only essential attributes, remove style overrides
              if (el instanceof SVGElement) {
                // Remove fill and stroke attributes that override CSS
                el.removeAttribute('style');
                
                // For shapes, let CSS handle colors completely
                if (el.tagName === 'rect' || el.tagName === 'circle' || el.tagName === 'polygon' || el.tagName === 'path') {
                  // Keep structural attributes but remove color attributes
                  const structuralAttrs = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform'];
                  const currentAttrs = Array.from(el.attributes);
                  currentAttrs.forEach(attr => {
                    if (!structuralAttrs.includes(attr.name) && attr.name !== 'class' && attr.name !== 'id') {
                      el.removeAttribute(attr.name);
                    }
                  });
                  
                  // Ensure rectangles have rounded corners
                  if (el.tagName === 'rect') {
                    if (!el.hasAttribute('rx')) el.setAttribute('rx', '8');
                    if (!el.hasAttribute('ry')) el.setAttribute('ry', '8');
                  }
                }
                
                // For text elements, remove fill but keep positioning
                if (el.tagName === 'text' || el.tagName === 'tspan') {
                  el.removeAttribute('fill');
                  el.removeAttribute('stroke');
                }
              }
            });
          }
          
          console.log(`✅ ${diagramType} diagram rendered successfully with CSS theme applied`);
        }
      } else {
        throw new Error('Invalid Mermaid syntax');
      }
    } catch (err) {
      console.error(`Error rendering ${diagramType} diagram:`, err);
      console.error(`📄 Full diagram code that failed:`, diagramCode);
      if (containerRef) {
        containerRef.innerHTML = `
          <div class="flex items-center justify-center h-32 text-destructive">
            <p>Error rendering ${diagramType}: ${err instanceof Error ? err.message : 'Unknown error'}</p>
          </div>
        `;
      }
    }
  };

  const EmptyState = ({ message, subMessage }: { message: string; subMessage: string }) => (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        <p className="text-muted-foreground">{message}</p>
        <p className="mt-2 text-sm text-muted-foreground">{subMessage}</p>
        <div className="flex gap-2 justify-center mt-4">
          {selectedProjectId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDiagram}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isLoading ? 'Loading...' : 'Retry'}
            </Button>
          )}
          {selectedProjectId && (!diagramData?.businessFlow && !diagramData?.dataFlow) && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={generateDiagrams}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutGrid className="h-4 w-4" />}
              {isLoading ? 'Generating...' : 'Generate Diagrams'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
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

          {/* Board Tab - Dual diagram display */}
          <TabsContent value="board" className="flex-1 overflow-auto p-4 m-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading diagrams...</span>
                </div>
              </div>
            ) : error ? (
              <EmptyState 
                message="Failed to load diagrams" 
                subMessage={`Error: ${error}`} 
              />
            ) : !selectedProjectId ? (
              <EmptyState 
                message="No project selected" 
                subMessage="Select a project from the sidebar to view its architecture diagrams" 
              />
            ) : (!diagramData?.businessFlow && !diagramData?.dataFlow) ? (
              <EmptyState 
                message="No diagrams available" 
                subMessage="This project doesn't have generated diagrams yet. Try re-ingesting the repository." 
              />
            ) : (
              <div className="h-full w-full space-y-6 overflow-auto">
                {/* Business Flow Diagram */}
                {diagramData?.businessFlow && (
                  <div className="border border-border rounded-lg overflow-hidden diagram-container">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h3 className="text-sm font-medium">
                        Business Flow Diagram
                      </h3>
                    </div>
                    <div 
                      ref={(el) => {
                        if (el) businessFlowRef.current = el;
                        if (el && diagramData.businessFlow) {
                          renderDiagram(diagramData.businessFlow, el, 'business-flow');
                        }
                      }}
                      className="flex items-center justify-center min-h-[400px] p-4 bg-background diagram-zoom"
                      style={{ 
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onClick={(e) => {
                        // Don't zoom if this was a drag operation
                        if (e.currentTarget.hasAttribute('data-dragging')) {
                          e.currentTarget.removeAttribute('data-dragging');
                          return;
                        }

                        const element = e.currentTarget;
                        const isZoomed = element.classList.contains('zoomed');
                        
                        if (isZoomed) {
                          // Reset zoom
                          element.classList.remove('zoomed');
                          element.scrollLeft = 0;
                          element.scrollTop = 0;
                          element.style.cursor = 'zoom-in';
                          const svg = element.querySelector('svg');
                          if (svg) {
                            svg.style.transform = 'scale(1)';
                            svg.style.transformOrigin = 'center center';
                          }
                        } else {
                          // Get click position relative to the container
                          const rect = element.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          
                          // Convert click position to percentages
                          const clickPercentX = clickX / rect.width;
                          const clickPercentY = clickY / rect.height;
                          
                          // Zoom into clicked location
                          element.classList.add('zoomed');
                          element.style.cursor = 'grab';
                          
                          const svg = element.querySelector('svg');
                          if (svg) {
                            const zoomLevel = 2;
                            
                            // Set transform origin to the clicked point as percentage
                            svg.style.transformOrigin = `${clickPercentX * 100}% ${clickPercentY * 100}%`;
                            svg.style.transform = `scale(${zoomLevel})`;
                            
                            // Calculate new scroll position to keep clicked point visible
                            setTimeout(() => {
                              const svgRect = svg.getBoundingClientRect();
                              const containerRect = element.getBoundingClientRect();
                              
                              const newScrollX = (clickPercentX * svgRect.width) - (containerRect.width / 2);
                              const newScrollY = (clickPercentY * svgRect.height) - (containerRect.height / 2);
                              
                              element.scrollLeft = Math.max(0, newScrollX);
                              element.scrollTop = Math.max(0, newScrollY);
                            }, 50);
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        const element = e.currentTarget;
                        if (!element.classList.contains('zoomed')) return;
                        
                        e.preventDefault();
                        let isMouseDown = true;
                        let hasMoved = false;
                        let startX = e.pageX - element.offsetLeft;
                        let startY = e.pageY - element.offsetTop;
                        let scrollLeft = element.scrollLeft;
                        let scrollTop = element.scrollTop;
                        
                        element.style.cursor = 'grabbing';
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          if (!isMouseDown) return;
                          e.preventDefault();
                          hasMoved = true;
                          const x = e.pageX - element.offsetLeft;
                          const y = e.pageY - element.offsetTop;
                          const walkX = (x - startX) * 1.5;
                          const walkY = (y - startY) * 1.5;
                          element.scrollLeft = scrollLeft - walkX;
                          element.scrollTop = scrollTop - walkY;
                        };
                        
                        const handleMouseUp = () => {
                          isMouseDown = false;
                          element.style.cursor = 'grab';
                          
                          // Mark as dragging if mouse moved to prevent onClick
                          if (hasMoved) {
                            element.setAttribute('data-dragging', 'true');
                          }
                          
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  </div>
                )}

                {/* Data Flow Diagram */}
                {diagramData?.dataFlow && (
                  <div className="border border-border rounded-lg overflow-hidden diagram-container">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h3 className="text-sm font-medium">
                        Data Flow Diagram
                      </h3>
                    </div>
                    <div 
                      ref={(el) => {
                        if (el) dataFlowRef.current = el;
                        if (el && diagramData.dataFlow) {
                          renderDiagram(diagramData.dataFlow, el, 'data-flow');
                        }
                      }}
                      className="flex items-center justify-center min-h-[400px] p-4 bg-background diagram-zoom"
                      style={{ 
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onClick={(e) => {
                        // Don't zoom if this was a drag operation
                        if (e.currentTarget.hasAttribute('data-dragging')) {
                          e.currentTarget.removeAttribute('data-dragging');
                          return;
                        }

                        const element = e.currentTarget;
                        const isZoomed = element.classList.contains('zoomed');
                        
                        if (isZoomed) {
                          // Reset zoom
                          element.classList.remove('zoomed');
                          element.scrollLeft = 0;
                          element.scrollTop = 0;
                          element.style.cursor = 'zoom-in';
                          const svg = element.querySelector('svg');
                          if (svg) {
                            svg.style.transform = 'scale(1)';
                            svg.style.transformOrigin = 'center center';
                          }
                        } else {
                          // Get click position relative to the container
                          const rect = element.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          
                          // Convert click position to percentages
                          const clickPercentX = clickX / rect.width;
                          const clickPercentY = clickY / rect.height;
                          
                          // Zoom into clicked location
                          element.classList.add('zoomed');
                          element.style.cursor = 'grab';
                          
                          const svg = element.querySelector('svg');
                          if (svg) {
                            const zoomLevel = 2;
                            
                            // Set transform origin to the clicked point as percentage
                            svg.style.transformOrigin = `${clickPercentX * 100}% ${clickPercentY * 100}%`;
                            svg.style.transform = `scale(${zoomLevel})`;
                            
                            // Calculate new scroll position to keep clicked point visible
                            setTimeout(() => {
                              const svgRect = svg.getBoundingClientRect();
                              const containerRect = element.getBoundingClientRect();
                              
                              const newScrollX = (clickPercentX * svgRect.width) - (containerRect.width / 2);
                              const newScrollY = (clickPercentY * svgRect.height) - (containerRect.height / 2);
                              
                              element.scrollLeft = Math.max(0, newScrollX);
                              element.scrollTop = Math.max(0, newScrollY);
                            }, 50);
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        const element = e.currentTarget;
                        if (!element.classList.contains('zoomed')) return;
                        
                        e.preventDefault();
                        let isMouseDown = true;
                        let hasMoved = false;
                        let startX = e.pageX - element.offsetLeft;
                        let startY = e.pageY - element.offsetTop;
                        let scrollLeft = element.scrollLeft;
                        let scrollTop = element.scrollTop;
                        
                        element.style.cursor = 'grabbing';
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          if (!isMouseDown) return;
                          e.preventDefault();
                          hasMoved = true;
                          const x = e.pageX - element.offsetLeft;
                          const y = e.pageY - element.offsetTop;
                          const walkX = (x - startX) * 1.5;
                          const walkY = (y - startY) * 1.5;
                          element.scrollLeft = scrollLeft - walkX;
                          element.scrollTop = scrollTop - walkY;
                        };
                        
                        const handleMouseUp = () => {
                          isMouseDown = false;
                          element.style.cursor = 'grab';
                          
                          // Mark as dragging if mouse moved to prevent onClick
                          if (hasMoved) {
                            element.setAttribute('data-dragging', 'true');
                          }
                          
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Code Tab - Raw Mermaid code for both diagrams */}
          <TabsContent value="code" className="flex-1 overflow-auto p-4 m-0">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading code...</span>
                </div>
              </div>
            ) : error ? (
              <EmptyState 
                message="Failed to load code" 
                subMessage={`Error: ${error}`} 
              />
            ) : !selectedProjectId ? (
              <EmptyState 
                message="No project selected" 
                subMessage="Select a project from the sidebar to view its Mermaid code" 
              />
            ) : (!diagramData?.businessFlow && !diagramData?.dataFlow) ? (
              <EmptyState 
                message="No code available" 
                subMessage="This project doesn't have generated Mermaid code yet." 
              />
            ) : (
              <div className="h-full w-full space-y-6 overflow-auto">
                {/* Business Flow Code */}
                {diagramData?.businessFlow && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h3 className="text-sm font-medium">
                        Business Flow - Mermaid Code
                      </h3>
                    </div>
                    <pre className="font-mono text-sm p-4 bg-muted rounded-b-lg overflow-auto max-h-96 whitespace-pre-wrap">
                      <code>{diagramData.businessFlow}</code>
                    </pre>
                  </div>
                )}

                {/* Data Flow Code */}
                {diagramData?.dataFlow && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-card px-4 py-2 border-b border-border">
                      <h3 className="text-sm font-medium">
                        Data Flow - Mermaid Code
                      </h3>
                    </div>
                    <pre className="font-mono text-sm p-4 bg-muted rounded-b-lg overflow-auto max-h-96 whitespace-pre-wrap">
                      <code>{diagramData.dataFlow}</code>
                    </pre>
                  </div>
                )}

                {diagramData?.updatedAt && (
                  <div className="text-xs text-muted-foreground px-4">
                    Last updated: {new Date(diagramData.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
