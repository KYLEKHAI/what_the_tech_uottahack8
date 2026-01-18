import { generateClaudeResponse } from "@/lib/claude";

/**
 * Cleans Claude response by removing markdown code blocks and extracting only the Mermaid code
 */
function cleanMermaidResponse(response: string): string {
  console.log('🧹 Cleaning Claude response:', { 
    originalLength: response.length,
    startsWithCodeBlock: response.trim().startsWith('```'),
    preview: response.substring(0, 100) + '...'
  });
  
  // Remove markdown code blocks and extra text
  let cleaned = response.trim();
  
  // More aggressive removal of code block markers
  cleaned = cleaned.replace(/^```\s*mermaid\s*\n?/gi, '');
  cleaned = cleaned.replace(/^```\s*\n?/g, '');
  cleaned = cleaned.replace(/\n?```\s*$/g, '');
  
  // Remove any explanation text after the diagram
  const lines = cleaned.split('\n');
  const mermaidLines: string[] = [];
  let foundDiagramStart = false;
  let insideDiagram = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines at the beginning
    if (!foundDiagramStart && !trimmedLine) continue;
    
    // Start capturing when we find a diagram declaration
    if (!foundDiagramStart && (trimmedLine.startsWith('flowchart') || trimmedLine.startsWith('graph'))) {
      foundDiagramStart = true;
      insideDiagram = true;
    }
    
    if (foundDiagramStart) {
      // Stop if we hit explanatory text or empty lines followed by text
      if (trimmedLine.startsWith('This diagram') || 
          trimmedLine.startsWith('The diagram') ||
          trimmedLine.startsWith('This flowchart') ||
          trimmedLine.match(/^\d+\./) ||
          trimmedLine.startsWith('The flow shows') ||
          trimmedLine.startsWith('This illustrates')) {
        break;
      }
      
      // Include the line if it's part of the diagram
      if (insideDiagram) {
        mermaidLines.push(line);
      }
    }
  }
  
  const result = mermaidLines.join('\n').trim();
  console.log('✨ Cleaned result:', { 
    cleanedLength: result.length,
    startsWithFlowchart: result.startsWith('flowchart'),
    preview: result.substring(0, 100) + '...'
  });
  
  return result;
}

export interface ProjectAnalysis {
  businessFlow: string;
  dataFlow: string;
  architecture: {
    components: string[];
    layers: string[];
    entryPoints: string[];
    databases: string[];
    apis: string[];
    frontend: string[];
    services: string[];
  };
}

/**
 * Analyzes XML content and generates comprehensive Mermaid diagrams
 * for both business flow and data flow of the entire project
 */
export async function generateProjectDiagrams(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<{ businessFlow: string; dataFlow: string }> {
  try {
    console.log("🎯 Starting AI-powered diagram generation for:", `${repoInfo.owner}/${repoInfo.name}`);

    // Generate diagrams directly with AI - no intermediate analysis needed
    const analysis = await analyzeProjectStructure(xmlContent, repoInfo);
    
    // Return only the AI-generated business and data flow diagrams
    const businessFlow = analysis.businessFlow;
    const dataFlow = analysis.dataFlow;

    console.log("✅ Successfully generated AI-powered diagrams");
    
    return {
      businessFlow,
      dataFlow
    };
  } catch (error) {
    console.error("❌ Error generating diagrams:", error);
    // Return fallback diagrams
    const fallback = generateFallbackDiagrams(repoInfo);
    return {
      businessFlow: fallback.businessFlow,
      dataFlow: fallback.dataFlow
    };
  }
}

/**
 * Generates AI-powered business flow diagram
 */
async function generateAIBusinessFlowDiagram(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<string> {
  console.log("� Generating AI-powered business flow diagram...");
  
  const businessFlowPrompt = `# Business Flow Diagram Generation Task

You are an expert software architect. Analyze the provided project code and generate a comprehensive Mermaid flowchart showing all user journeys and business processes.

## Project Information
- **Repository**: ${repoInfo.owner}/${repoInfo.name}
- **Task**: Create a detailed business flow diagram

## Requirements
Create a Mermaid flowchart that shows: THE OVERALL BUSINESS FLOW DIAGRAM PLEASE LOOK TO SEE WHAT THATA IS I WANT TO SEE OVERALL

### User Types & Authentication
- Different user roles (admin, user, guest, etc.)
- Registration and login flows
- Authentication states and permissions
- Session management

### Core Business Processes
- Main application workflows
- CRUD operations and data manipulation
- File uploads, processing, or generation
- Search, filtering, and data retrieval
- Integration with external services
- Background processes and async operations

### Decision Points & Error Handling
- Validation steps and error paths
- Success/failure branches
- Edge cases and exception handling
- Retry mechanisms and fallbacks

## Styling Requirements
- Use CSS classes for theme-responsive design
- NO EMOJIS in node labels - use clean text only
- Use rounded rectangles for processes
- Use decision diamonds for conditional logic
- Use cylinders for data storage
- Apply consistent theming with CSS classes

## Technical Specifications
- **Format**: Mermaid flowchart syntax only
- **Direction**: Use 'flowchart TD' (top-down) for complex flows
- **Nodes**: Use clean, descriptive names from actual code (NO EMOJIS)
- **Styling**: CRITICAL - Do NOT define classDef with colors. Just assign class names to nodes.

## Output Format
Provide ONLY the Mermaid code starting with 'flowchart TD'.
PROVIDE ONLY THE MERMAID CODE I WANT DONT ANY MARKDOWN BLOCKS LIKE "'''"
PROVIDE ONLY THE CODE STARTING FROM 'flowchart TD' and ending at the last line I DONT WANT ANY COMMENTS AFTER THAT ONLY PURELY CODE
Do NOT include any markdown code blocks.  
Do NOT include any explanations, descriptions, or additional text.
Do NOT use emojis in node labels.

CRITICAL STYLING INSTRUCTIONS:
- Do NOT write: classDef primaryNode fill:#color,stroke:#color
- ONLY assign classes to nodes using: class A,B,C primaryNode
- Available class names: primaryNode, secondaryNode, dataNode, decisionNode, userNode
- CSS will handle all colors automatically based on theme
- Example: class A,G,H primaryNode

Place class assignments AFTER the flowchart structure.
Do NOT include any classDef statements.
Do NOT hardcode any colors.
Ensure the syntax is valid before responding.

## Project Code Analysis
${xmlContent.slice(0, 20000)}`;

  try {
    const response = await generateClaudeResponse(businessFlowPrompt, xmlContent);
    return cleanMermaidResponse(response);
  } catch (error) {
    console.error("Error generating AI business flow diagram:", error);
    return generateFallbackBusinessFlow(repoInfo);
  }
}

/**
 * Generates AI-powered data flow diagram
 */
async function generateAIDataFlowDiagram(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<string> {
  console.log("📊 Generating AI-powered data flow diagram...");
  
  const dataFlowPrompt = `# Data Flow Diagram Generation Task

You are an expert software architect. Analyze the provided project code and generate a comprehensive Mermaid flowchart showing how data moves through the entire system.

## Project Information  
- **Repository**: ${repoInfo.owner}/${repoInfo.name}
- **Task**: Create a detailed data flow diagram

## Requirements
Create a Mermaid flowchart that shows:

### Data Sources & Input
- User input forms and interfaces
- File uploads and imports
- API endpoints receiving data
- External service integrations
- Database queries and retrievals
- Environment variables and configuration

### Data Processing & Transformation
- Validation and sanitization steps
- Business logic processing
- Data parsing and formatting
- Calculations and computations
- Background jobs and queues
- Caching mechanisms

### Data Storage & Persistence
- Database writes and updates
- File system storage
- Session and temporary storage
- External service data sync
- Backup and archival processes

### Data Output & Distribution
- API responses and exports
- User interface updates
- File generation and downloads
- Email notifications
- External service updates
- Real-time data streaming

## Styling Requirements
- Use CSS classes for theme-responsive design
- NO EMOJIS in node labels - use clean text only
- Use appropriate shapes for different data operations
- Apply consistent theming with CSS classes

## Technical Specifications
- **Format**: Mermaid flowchart syntax only
- **Direction**: Use 'flowchart LR' (left-right) for data flow
- **Shapes**: Use appropriate shapes:
  - Rectangles [Process] for processing steps
  - Cylinders [(Database)] for storage
  - Diamonds {Decision} for validation/routing
- **Styling**: CRITICAL - Do NOT define classDef with colors. Just assign class names to nodes.

## Output Format
Provide ONLY the Mermaid code starting with 'flowchart LR'.
Do NOT include any markdown code blocks.
Do NOT include any explanations, descriptions, or additional text.
Do NOT use emojis in node labels.

CRITICAL STYLING INSTRUCTIONS:
- Do NOT write: classDef inputNode fill:#color,stroke:#color
- ONLY assign classes to nodes using: class A,B,C inputNode
- Available class names: inputNode, processNode, storageNode, outputNode, validationNode
- CSS will handle all colors automatically based on theme
- Example: class A,D inputNode

Place class assignments AFTER the flowchart structure.
Do NOT include any classDef statements.
Do NOT hardcode any colors.
Ensure the syntax is valid before responding.

## Project Code Analysis
${xmlContent.slice(0, 20000)}`;

  try {
    const response = await generateClaudeResponse(dataFlowPrompt, xmlContent);
    return cleanMermaidResponse(response);
  } catch (error) {
    console.error("Error generating AI data flow diagram:", error);
    return generateFallbackDataFlow(repoInfo);
  }
}

/**
 * Analyzes the XML content using AI to extract project structure and components
 */
async function analyzeProjectStructure(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<ProjectAnalysis> {
  try {
    console.log("🔍 Analyzing project structure with AI...");
    
    // Generate both diagrams with detailed AI analysis
    const [businessFlow, dataFlow] = await Promise.all([
      generateAIBusinessFlowDiagram(xmlContent, repoInfo),
      generateAIDataFlowDiagram(xmlContent, repoInfo)
    ]);

    const analysis: ProjectAnalysis = {
      businessFlow,
      dataFlow,
      architecture: {
        components: [],
        layers: [],
        entryPoints: [],
        databases: [],
        apis: [],
        frontend: [],
        services: []
      }
    };

    console.log("📊 AI Analysis complete with dedicated diagrams generated");
    return analysis;
  } catch (error) {
    console.error("Error in AI project analysis:", error);
    // Fallback to basic analysis if AI fails
    return await analyzeProjectStructureFallback(xmlContent, repoInfo);
  }
}

/**
 * Fallback business flow diagram if AI generation fails
 */
function generateFallbackBusinessFlow(repoInfo: { owner: string; name: string }): string {
  return `flowchart TD
    subgraph "${repoInfo.name} - Business Flow"
        User[User Access]
        Auth[Authentication]
        Dashboard[Dashboard]
        Features[Core Features]
        Data[Data Operations]
        
        User --> Auth
        Auth -->|Success| Dashboard
        Auth -->|Failed| User
        Dashboard --> Features
        Features --> Data
        Data --> Dashboard
    end
    
    class User userNode
    class Auth primaryNode
    class Dashboard,Features secondaryNode
    class Data dataNode`;
}

/**
 * Fallback data flow diagram if AI generation fails
 */
function generateFallbackDataFlow(repoInfo: { owner: string; name: string }): string {
  return `flowchart LR
    subgraph "${repoInfo.name} - Data Flow"
        Input[User Input]
        Process[Data Processing]
        Validate[Validation]
        Store[(Database Storage)]
        Output[System Response]
        
        Input --> Process
        Process --> Validate
        Validate --> Store
        Store --> Output
        Output --> Input
    end
    
    class Input inputNode
    class Process processNode
    class Store storageNode
    class Output outputNode
    class Validate validationNode`;
}
async function analyzeProjectStructureFallback(
  xmlContent: string,
  repoInfo: { owner: string; name: string }
): Promise<ProjectAnalysis> {
  console.log("🔄 Using fallback analysis...");
  
  const analysis: ProjectAnalysis = {
    businessFlow: "User interaction workflow",
    dataFlow: "Data processing and storage",
    architecture: {
      components: [],
      layers: [],
      entryPoints: [],
      databases: [],
      apis: [],
      frontend: [],
      services: []
    }
  };

  // Parse XML to identify key components using pattern matching
  const lines = xmlContent.split('\n');
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Database components
    if (lowerLine.includes('database') || lowerLine.includes('db') || 
        lowerLine.includes('mongodb') || lowerLine.includes('postgresql') ||
        lowerLine.includes('mysql') || lowerLine.includes('sqlite') ||
        lowerLine.includes('supabase') || lowerLine.includes('prisma')) {
      analysis.architecture.databases.push(extractComponentName(line));
    }
    
    // API components
    if (lowerLine.includes('api') || lowerLine.includes('route') ||
        lowerLine.includes('controller') || lowerLine.includes('endpoint') ||
        lowerLine.includes('/api/') || lowerLine.includes('express') ||
        lowerLine.includes('fastapi') || lowerLine.includes('flask')) {
      analysis.architecture.apis.push(extractComponentName(line));
    }
    
    // Frontend components
    if (lowerLine.includes('component') || lowerLine.includes('page') ||
        lowerLine.includes('react') || lowerLine.includes('vue') ||
        lowerLine.includes('angular') || lowerLine.includes('tsx') ||
        lowerLine.includes('jsx') || lowerLine.includes('template')) {
      analysis.architecture.frontend.push(extractComponentName(line));
    }
    
    // Service components
    if (lowerLine.includes('service') || lowerLine.includes('worker') ||
        lowerLine.includes('job') || lowerLine.includes('task') ||
        lowerLine.includes('queue') || lowerLine.includes('background')) {
      analysis.architecture.services.push(extractComponentName(line));
    }
    
    // Entry points
    if (lowerLine.includes('main') || lowerLine.includes('index') ||
        lowerLine.includes('app') || lowerLine.includes('server') ||
        lowerLine.includes('start') || lowerLine.includes('entry')) {
      analysis.architecture.entryPoints.push(extractComponentName(line));
    }
  }

  // Remove duplicates and empty entries
  Object.keys(analysis.architecture).forEach(key => {
    const typedKey = key as keyof typeof analysis.architecture;
    analysis.architecture[typedKey] = [...new Set(analysis.architecture[typedKey])]
      .filter(item => item && item.length > 0)
      .slice(0, 8);
  });

  return analysis;
}

/**
 * Extracts component name from a line of XML/code
 */
function extractComponentName(line: string): string {
  // Extract filename or component name from various patterns
  const patterns = [
    /\/([^\/]+\.(ts|js|tsx|jsx|py|java|go|rb|php|cs))$/i,
    /class\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /function\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /const\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    /([A-Za-z_][A-Za-z0-9_]*\.component)/i,
    /([A-Za-z_][A-Za-z0-9_]*\.service)/i,
    /\/([A-Za-z_][A-Za-z0-9_\-]*)\//i
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/\.(ts|js|tsx|jsx|py|java|go|rb|php|cs)$/, '');
    }
  }
  
  return '';
}

/**
 * Generates business flow diagram showing user interactions and business processes
 */
function generateBusinessFlowDiagram(
  analysis: ProjectAnalysis,
  repoInfo: { owner: string; name: string }
): string {
  console.log("🔄 Generating business flow diagram...");
  
  const { frontend, apis, services, databases } = analysis.architecture;
  
  let diagram = `%% ${analysis.businessFlow || 'User interaction workflow'}
flowchart TD
    subgraph "${repoInfo.name} - Business Flow"
        User[👤 User]
        
        subgraph "User Interface"`;
  
  // Add frontend components
  if (frontend.length > 0) {
    frontend.slice(0, 4).forEach((comp, i) => {
      diagram += `\n            UI${i + 1}[${comp}]`;
    });
  } else {
    diagram += `\n            UI1[Frontend Interface]`;
  }
  
  diagram += `\n        end
        
        subgraph "Business Logic"`;
  
  // Add API/service components
  if (apis.length > 0) {
    apis.slice(0, 4).forEach((api, i) => {
      diagram += `\n            API${i + 1}[${api}]`;
    });
  } else {
    diagram += `\n            API1[API Layer]`;
  }
  
  if (services.length > 0) {
    services.slice(0, 3).forEach((service, i) => {
      diagram += `\n            SVC${i + 1}[${service}]`;
    });
  }
  
  diagram += `\n        end
        
        subgraph "Data Layer"`;
  
  // Add database components
  if (databases.length > 0) {
    databases.slice(0, 3).forEach((db, i) => {
      diagram += `\n            DB${i + 1}[(${db})]`;
    });
  } else {
    diagram += `\n            DB1[(Database)]`;
  }
  
  diagram += `\n        end
    end
    
    %% Business Flow Connections
    User --> UI1`;
  
  if (frontend.length > 1) {
    diagram += `\n    User --> UI2`;
  }
  
  diagram += `\n    UI1 --> API1`;
  if (apis.length > 1) {
    diagram += `\n    UI1 --> API2`;
  }
  
  diagram += `\n    API1 --> DB1`;
  
  if (services.length > 0) {
    diagram += `\n    API1 --> SVC1`;
    diagram += `\n    SVC1 --> DB1`;
  }
  
  if (databases.length > 1) {
    diagram += `\n    API1 --> DB2`;
  }
  
  diagram += `
    
    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px  
    classDef apiClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef serviceClass fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef dataClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class User userClass
    class UI1,UI2,UI3,UI4 uiClass
    class API1,API2,API3,API4 apiClass
    class SVC1,SVC2,SVC3 serviceClass
    class DB1,DB2,DB3 dataClass`;

  return diagram;
}

/**
 * Generates data flow diagram showing how data moves through the system
 */
function generateDataFlowDiagram(
  analysis: ProjectAnalysis,
  repoInfo: { owner: string; name: string }
): string {
  console.log("📊 Generating data flow diagram...");
  
  const { frontend, apis, services, databases, entryPoints } = analysis.architecture;
  
  let diagram = `%% ${analysis.dataFlow || 'Data processing and storage flow'}
flowchart LR
    subgraph "${repoInfo.name} - Data Flow"
        subgraph "Input Sources"
            EXT1[External APIs]
            EXT2[User Input] 
            EXT3[File System]
        end
        
        subgraph "Processing Layer"`;
  
  if (entryPoints.length > 0) {
    entryPoints.slice(0, 3).forEach((entry, i) => {
      diagram += `\n            PROC${i + 1}[${entry}]`;
    });
  } else {
    diagram += `\n            PROC1[Main Process]`;
  }
  
  if (services.length > 0) {
    services.slice(0, 2).forEach((service, i) => {
      diagram += `\n            WORK${i + 1}[${service}]`;
    });
  }
  
  diagram += `\n        end
        
        subgraph "Data Storage"`;
  
  if (databases.length > 0) {
    databases.forEach((db, i) => {
      diagram += `\n            STORE${i + 1}[(${db})]`;
    });
  } else {
    diagram += `\n            STORE1[(Primary DB)]
            STORE2[(Cache/Session)]`;
  }
  
  diagram += `\n        end
        
        subgraph "Output Channels"`;
  
  if (apis.length > 0) {
    apis.slice(0, 3).forEach((api, i) => {
      diagram += `\n            OUT${i + 1}[${api}]`;
    });
  } else {
    diagram += `\n            OUT1[API Response]
            OUT2[Web Interface]`;
  }
  
  diagram += `\n        end
    end
    
    %% Data Flow Connections
    EXT1 -->|External Data| PROC1
    EXT2 -->|User Data| PROC1
    EXT3 -->|File Data| PROC1`;
  
  if (entryPoints.length > 1) {
    diagram += `\n    EXT1 -->|API Calls| PROC2`;
  }
  
  diagram += `\n    PROC1 -->|Processed Data| STORE1`;
  
  if (services.length > 0) {
    diagram += `\n    PROC1 -->|Background Jobs| WORK1
    WORK1 -->|Transformed Data| STORE1`;
  }
  
  if (databases.length > 1) {
    diagram += `\n    PROC1 -->|Session Data| STORE2
    STORE1 -->|Query Results| OUT1`;
  }
  
  diagram += `\n    STORE1 -->|Data| OUT1
    OUT1 -->|Response| EXT2`;
  
  if (apis.length > 1) {
    diagram += `\n    STORE1 -->|Data| OUT2
    OUT2 -->|Interface| EXT2`;
  }
  
  diagram += `
    
    %% Styling for Data Flow
    classDef inputClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef processClass fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    classDef storageClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef outputClass fill:#fff8e1,stroke:#ffa000,stroke-width:2px
    
    class EXT1,EXT2,EXT3 inputClass
    class PROC1,PROC2,PROC3,WORK1,WORK2 processClass
    class STORE1,STORE2,STORE3 storageClass
    class OUT1,OUT2,OUT3 outputClass`;

  return diagram;
}

/**
 * Generates combined overview diagram showing overall system architecture
 */
function generateCombinedOverviewDiagram(
  analysis: ProjectAnalysis,
  repoInfo: { owner: string; name: string }
): string {
  console.log("🎯 Generating combined overview diagram...");
  
  const { frontend, apis, services, databases, entryPoints } = analysis.architecture;
  
  let diagram = `graph TB
    subgraph "${repoInfo.name} - System Overview"
        subgraph "Presentation Tier"`;
  
  if (frontend.length > 0) {
    frontend.slice(0, 3).forEach((comp, i) => {
      diagram += `\n            FE${i + 1}[${comp}]`;
    });
  } else {
    diagram += `\n            FE1[Frontend App]`;
  }
  
  diagram += `\n        end
        
        subgraph "Application Tier"`;
  
  if (entryPoints.length > 0) {
    entryPoints.slice(0, 2).forEach((entry, i) => {
      diagram += `\n            APP${i + 1}[${entry}]`;
    });
  }
  
  if (apis.length > 0) {
    apis.slice(0, 3).forEach((api, i) => {
      diagram += `\n            API${i + 1}[${api}]`;
    });
  } else {
    diagram += `\n            API1[API Gateway]`;
  }
  
  if (services.length > 0) {
    services.slice(0, 2).forEach((service, i) => {
      diagram += `\n            SVC${i + 1}[${service}]`;
    });
  }
  
  diagram += `\n        end
        
        subgraph "Data Tier"`;
  
  if (databases.length > 0) {
    databases.forEach((db, i) => {
      diagram += `\n            DATA${i + 1}[(${db})]`;
    });
  } else {
    diagram += `\n            DATA1[(Main Database)]
            DATA2[(Cache Layer)]`;
  }
  
  diagram += `\n        end
        
        subgraph "External Systems"
            EXT1[Third-party APIs]
            EXT2[File Storage]
            EXT3[External Services]
        end
    end
    
    %% System Connections
    FE1 <--> API1`;
  
  if (frontend.length > 1) {
    diagram += `\n    FE2 <--> API1`;
  }
  
  if (entryPoints.length > 0) {
    diagram += `\n    API1 <--> APP1`;
    if (entryPoints.length > 1) {
      diagram += `\n    API1 <--> APP2`;
    }
  }
  
  diagram += `\n    API1 <--> DATA1`;
  
  if (services.length > 0) {
    diagram += `\n    API1 --> SVC1
    SVC1 --> DATA1`;
    if (services.length > 1) {
      diagram += `\n    SVC1 <--> SVC2`;
    }
  }
  
  if (databases.length > 1) {
    diagram += `\n    API1 <--> DATA2
    DATA1 <--> DATA2`;
  }
  
  diagram += `\n    API1 <--> EXT1
    ${services.length > 0 ? 'SVC1' : 'API1'} <--> EXT2
    ${services.length > 0 ? 'SVC1' : 'API1'} <--> EXT3`;
  
  diagram += `
    
    %% Enhanced Styling
    classDef presentationClass fill:#e8eaf6,stroke:#3f51b5,stroke-width:3px
    classDef applicationClass fill:#e8f5e8,stroke:#4caf50,stroke-width:3px
    classDef dataClass fill:#fce4ec,stroke:#e91e63,stroke-width:3px
    classDef externalClass fill:#fff3e0,stroke:#ff9800,stroke-width:2px,stroke-dasharray: 5 5
    
    class FE1,FE2,FE3 presentationClass
    class APP1,APP2,API1,API2,API3,SVC1,SVC2 applicationClass
    class DATA1,DATA2,DATA3 dataClass
    class EXT1,EXT2,EXT3 externalClass`;

  return diagram;
}

/**
 * Generates fallback diagrams when analysis fails
 */
function generateFallbackDiagrams(repoInfo: { owner: string; name: string }) {
  console.log("⚠️ Generating fallback diagrams...");
  
  const businessFlow = `flowchart TD
    subgraph "${repoInfo.name} - Basic Business Flow"
        User[👤 User] --> UI[User Interface]
        UI --> API[API Layer]
        API --> BL[Business Logic]
        BL --> DB[(Database)]
        DB --> API
        API --> UI
        UI --> User
    end
    
    classDef userClass fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef uiClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef logicClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef dataClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    
    class User userClass
    class UI uiClass
    class API,BL logicClass
    class DB dataClass`;
    
  const dataFlow = `flowchart LR
    subgraph "${repoInfo.name} - Basic Data Flow"
        Input[📥 Input] --> Process[⚙️ Processing]
        Process --> Store[(🗄️ Storage)]
        Store --> Output[📤 Output]
        Output --> Input
    end
    
    classDef inputClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef processClass fill:#f1f8e9,stroke:#689f38,stroke-width:2px
    classDef storageClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef outputClass fill:#fff8e1,stroke:#ffa000,stroke-width:2px
    
    class Input inputClass
    class Process processClass
    class Store storageClass
    class Output outputClass`;
    
  return { businessFlow, dataFlow };
}