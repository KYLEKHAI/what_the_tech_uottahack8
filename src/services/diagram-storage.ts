import { createServerClient } from "@supabase/ssr";

export interface DiagramSet {
  businessFlow: string;
  dataFlow: string;
}

/**
 * Saves diagrams to repo-artifacts storage for persistence
 */
export async function saveDiagramsToStorage(
  supabase: any,
  projectId: string,
  diagrams: DiagramSet
): Promise<void> {
  console.log(`💾 Saving diagrams to storage for project: ${projectId}`);

  const diagramsToSave = [
    {
      filename: `${projectId}/diagrams/business-flow.mmd`,
      content: diagrams.businessFlow,
      type: 'business-flow'
    },
    {
      filename: `${projectId}/diagrams/data-flow.mmd`,
      content: diagrams.dataFlow,
      type: 'data-flow'
    }
  ];

  // Save each diagram to storage
  const storagePromises = diagramsToSave.map(async (diagram) => {
    if (diagram.content) {
      const { error: storageError } = await supabase.storage
        .from('repo-artifacts')
        .upload(diagram.filename, new Blob([diagram.content], { type: 'text/plain' }), {
          upsert: true // Replace existing files
        });

      if (storageError) {
        console.warn(`Failed to save ${diagram.type} diagram to storage:`, storageError);
        throw storageError;
      } else {
        console.log(`✅ Saved ${diagram.type} diagram to storage: ${diagram.filename}`);
      }
    }
  });

  // Wait for all storage operations to complete
  await Promise.all(storagePromises);
  console.log('🎯 All diagrams saved to storage successfully');
}

/**
 * Loads diagrams from repo-artifacts storage
 */
export async function loadDiagramsFromStorage(
  supabase: any,
  projectId: string
): Promise<Partial<DiagramSet>> {
  console.log(`📥 Loading diagrams from storage for project: ${projectId}`);

  const loadDiagram = async (filename: string, type: string): Promise<string | null> => {
    try {
      const { data: diagramData, error: storageError } = await supabase.storage
        .from('repo-artifacts')
        .download(filename);
      
      if (storageError || !diagramData) {
        console.warn(`No ${type} diagram found in storage: ${filename}`);
        return null;
      }
      
      const content = await diagramData.text();
      console.log(`✅ Loaded ${type} diagram from storage`);
      return content;
    } catch (error) {
      console.warn(`Failed to load ${type} diagram from storage: ${filename}`, error);
      return null;
    }
  };

  // Load all diagram types
  const [businessFlow, dataFlow] = await Promise.all([
    loadDiagram(`${projectId}/diagrams/business-flow.mmd`, 'business-flow'),
    loadDiagram(`${projectId}/diagrams/data-flow.mmd`, 'data-flow')
  ]);

  const result: Partial<DiagramSet> = {};
  if (businessFlow) result.businessFlow = businessFlow;
  if (dataFlow) result.dataFlow = dataFlow;

  console.log('📊 Diagram loading summary:', {
    hasBusinessFlow: !!businessFlow,
    hasDataFlow: !!dataFlow
  });

  return result;
}

/**
 * Saves diagrams to both storage and database for redundancy
 */
export async function saveDiagramsComplete(
  supabase: any,
  projectId: string,
  diagrams: DiagramSet
): Promise<void> {
  // Save to storage first
  await saveDiagramsToStorage(supabase, projectId, diagrams);

  // Save to database for backward compatibility (use business flow as main diagram)
  const { error: dbError } = await supabase
    .from('projects')
    .update({
      board_mermaid: diagrams.businessFlow, // Use business flow as the main diagram
      board_updated_at: new Date().toISOString()
    })
    .eq('id', projectId);

  if (dbError) {
    console.error('Failed to save diagrams to database:', dbError);
    throw dbError;
  } else {
    console.log('✅ Diagrams saved to database successfully');
  }
}