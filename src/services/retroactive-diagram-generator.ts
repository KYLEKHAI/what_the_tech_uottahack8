import { generateProjectDiagrams } from "./diagram-generator";

export async function generateDiagramsForExistingProject(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<{ businessFlow: string; dataFlow: string }> {
  console.log("🔄 Generating diagrams for existing project:", `${repoInfo.owner}/${repoInfo.name}`);
  
  try {
    const diagrams = await generateProjectDiagrams(xmlContent, repoInfo);
    console.log("✅ Diagrams generated successfully for existing project");
    return diagrams;
  } catch (error) {
    console.error("❌ Error generating diagrams for existing project:", error);
    throw error;
  }
}