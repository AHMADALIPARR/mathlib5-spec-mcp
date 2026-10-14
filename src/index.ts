#!/usr/bin/env node
/**
 * MATHLIB5 Meta-Architecture MCP Server
 * 
 * Bridges the 10-layer VSCP architecture to AI agents via Model Context Protocol.
 * Provides full system introspection, layer access, and agent coordination.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ARCHITECTURE, AGENT_CAPABILITIES, LAYER_TOOLS, ArchitectureLayer, LayerTool } from './architecture.js';

// MCP Server Configuration
const SERVER_NAME = 'mathlib5-spec-mcp';
const SERVER_VERSION = '1.0.0';

// Create MCP Server
const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {}, resources: {} } }
);

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

// Resource URIs for architecture components
const RESOURCE_URI = {
  ARCHITECTURE: 'urn:mathlib5:architecture',
  LAYERS: 'urn:mathlib5:layers',
  AGENTS: 'urn:mathlib5:agents',
  SECURITY: 'urn:mathlib5:security',
  METADATA: 'urn:mathlib5:metadata',
  LAYER: (id: number) => `urn:mathlib5:layer:${id}`,
  AGENT: (name: string) => `urn:mathlib5:agent:${name}`,
  TOOL: (name: string) => `urn:mathlib5:tool:${name}`
};

// Register all resources
const AGENT_NAMES = Object.keys(AGENT_CAPABILITIES);

const SYSTEM_TOOLS = [
  { name: 'get_architecture', description: 'Return the full MATHLIB5 architecture definition as JSON',
    inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'get_layer', description: 'Return a single architecture layer by numeric id',
    inputSchema: { type: 'object' as const, properties: { layer_id: { type: 'number', description: 'Layer id (1-10)' } }, required: ['layer_id'] } },
  { name: 'list_layers', description: 'List all architecture layers',
    inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'list_agents', description: 'List all agents and their roles',
    inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'get_agent_capabilities', description: 'Return the capabilities of a named agent',
    inputSchema: { type: 'object' as const, properties: { agent_name: { type: 'string', enum: AGENT_NAMES, description: 'Agent name' } }, required: ['agent_name'] } },
  { name: 'get_security_config', description: 'Return the security configuration',
    inputSchema: { type: 'object' as const, properties: {} } },
  { name: 'list_tools', description: 'List all layer tools with their layer ids',
    inputSchema: { type: 'object' as const, properties: {} } },
];

const AGENT_TOOLS = [
  { name: 'query_solarium', description: 'Query the Solarium semantic layer',
    inputSchema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Query text' } }, required: ['query'] } },
  { name: 'coordinate_swarm', description: 'Activate Nexus swarm coordination',
    inputSchema: { type: 'object' as const, properties: {
      task: { type: 'string', description: 'Task description (optional)' },
      agents: { type: 'array', items: { type: 'string' }, description: 'Agents to involve (optional; default all)' } } } },
  { name: 'audit_system', description: 'Run a Sentinel system audit',
    inputSchema: { type: 'object' as const, properties: { scope: { type: 'string', description: 'Audit scope (optional; default full system)' } } } },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...SYSTEM_TOOLS, ...AGENT_TOOLS, ...LAYER_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: tool.arguments.reduce((acc, arg) => ({
          ...acc,
          [arg.name]: { type: arg.type, description: arg.description }
        }), {}),
        required: tool.arguments.map(a => a.name)
      }
    }))]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  // Architecture Overview
  if (uri === RESOURCE_URI.ARCHITECTURE) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(ARCHITECTURE, null, 2)
      }]
    };
  }
  
  // All Layers
  if (uri === RESOURCE_URI.LAYERS) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(ARCHITECTURE.layers, null, 2)
      }]
    };
  }
  
  // All Agents
  if (uri === RESOURCE_URI.AGENTS) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(AGENT_CAPABILITIES, null, 2)
      }]
    };
  }
  
  // Security Configuration
  if (uri === RESOURCE_URI.SECURITY) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(ARCHITECTURE.security, null, 2)
      }]
    };
  }
  
  // Metadata
  if (uri === RESOURCE_URI.METADATA) {
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(ARCHITECTURE.metadata, null, 2)
      }]
    };
  }
  
  // Specific Layer
  const layerMatch = uri.match(/^urn:mathlib5:layer:(\d+)$/);
  if (layerMatch) {
    const layerId = parseInt(layerMatch[1]);
    const layer = ARCHITECTURE.layers.find(l => l.id === layerId);
    if (layer) {
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(layer, null, 2)
        }]
      };
    }
  }
  
  // Specific Agent
  const agentMatch = uri.match(/^urn:mathlib5:agent:(\w+)$/);
  if (agentMatch) {
    const agentName = agentMatch[1];
    const agent = AGENT_CAPABILITIES[agentName];
    if (agent) {
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(agent, null, 2)
        }]
      };
    }
  }
  
  // Specific Tool
  const toolMatch = uri.match(/^urn:mathlib5:tool:(\w+)$/);
  if (toolMatch) {
    const toolName = toolMatch[1];
    const tool = LAYER_TOOLS.find(t => t.name === toolName);
    if (tool) {
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(tool, null, 2)
        }]
      };
    }
  }
  
  // Human-readable architecture summary
  if (uri === 'urn:mathlib5:summary') {
    return {
      contents: [{
        type: 'text',
        text: generateArchitectureSummary()
      }]
    };
  }
  
  throw new Error(`Unknown resource URI: ${uri}`);
});

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args: Record<string, unknown> = request.params.arguments ?? {};
  
  switch (name) {
    // System Introspection
    case 'get_architecture':
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(ARCHITECTURE, null, 2)
        }]
      };
    
    case 'get_layer':
      const layerId = args.layer_id as number;
      const layer = ARCHITECTURE.layers.find(l => l.id === layerId);
      if (!layer) {
        throw new Error(`Layer ${layerId} not found`);
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(layer, null, 2)
        }]
      };
    
    case 'list_layers':
      return {
        content: [{
          type: 'text',
          text: ARCHITECTURE.layers
            .map(l => `${l.id}. ${l.name} (${l.lang}) - ${l.role || l.format || ''}`)
            .join('\n')
        }]
      };
    
    case 'list_agents':
      return {
        content: [{
          type: 'text',
          text: Object.entries(ARCHITECTURE.agents)
            .map(([name, role]) => `- **${name}**: ${role}`)
            .join('\n')
        }]
      };
    
    case 'get_agent_capabilities':
      const agentName = args.agent_name as string;
      const agent = AGENT_CAPABILITIES[agentName];
      if (!agent) {
        throw new Error(`Agent ${agentName} not found`);
      }
      return {
        content: [{
          type: 'text',
          text: `${agent.name} (${agent.role}):\n` +
                agent.capabilities.map(c => `  - ${c}`).join('\n')
        }]
      };
    
    case 'get_security_config':
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(ARCHITECTURE.security, null, 2)
        }]
      };
    
    case 'list_tools':
      return {
        content: [{
          type: 'text',
          text: LAYER_TOOLS
            .map(t => `${t.name} (Layer ${t.layerId}): ${t.description}`)
            .join('\n')
        }]
      };
    
    // Layer-specific tools
    case 'parse_apl':
      return invokeLayerTool('parse_apl', args);
    case 'generate_sexpr':
      return invokeLayerTool('generate_sexpr', args);
    case 'refine_types':
      return invokeLayerTool('refine_types', args);
    case 'prove_theorem':
      return invokeLayerTool('prove_theorem', args);
    case 'verify_kernel':
      return invokeLayerTool('verify_kernel', args);
    case 'validate_fol':
      return invokeLayerTool('validate_fol', args);
    case 'solve_asp':
      return invokeLayerTool('solve_asp', args);
    case 'search_prism':
      return invokeLayerTool('search_prism', args);
    case 'seal_worm':
      return invokeLayerTool('seal_worm', args);
    case 'hunt_sorries':
      return invokeLayerTool('hunt_sorries', args);
    
    // Agent tools
    case 'query_solarium':
      return {
        content: [{
          type: 'text',
          text: `Querying Solarium semantic layer with: ${args.query}\n` +
                `Capabilities: ${AGENT_CAPABILITIES.solarium.capabilities.join(', ')}`
        }]
      };
    
    case 'coordinate_swarm':
      return {
        content: [{
          type: 'text',
          text: `Nexus swarm coordination activated.\n` +
                `Task: ${args.task || 'Not specified'}\n` +
                `Agents: ${args.agents ? (args.agents as string[]).join(', ') : 'All available'}`
        }]
      };
    
    case 'audit_system':
      return {
        content: [{
          type: 'text',
          text: `Sentinel audit initiated.\n` +
                `Scope: ${args.scope || 'Full system'}\n` +
                `Checks: ${AGENT_CAPABILITIES.sentinel.capabilities.join(', ')}`
        }]
      };
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate human-readable architecture summary
 */
function generateArchitectureSummary(): string {
  const lines: string[] = [
    '# MATHLIB5 VSCP Meta-Architecture',
    '',
    `**Version**: ${ARCHITECTURE.version}`,
    `**Status**: ${ARCHITECTURE.metadata.verificationStatus}`,
    `**Sovereign**: ${ARCHITECTURE.metadata.sovereign}`,
    `**WORM Sealed**: ${ARCHITECTURE.metadata.wormSealed}`,
    '',
    '## 10-Layer Pipeline',
    ''
  ];
  
  for (const layer of ARCHITECTURE.layers) {
    lines.push(`### Layer ${layer.id}: ${layer.name}`);
    lines.push(`- **Language**: ${layer.lang}`);
    if (layer.tool) lines.push(`- **Tool**: ${layer.tool}`);
    if (layer.format) lines.push(`- **Format**: ${layer.format}`);
    if (layer.role) lines.push(`- **Role**: ${layer.role}`);
    if (layer.path) lines.push(`- **Path**: ${layer.path}`);
    if (layer.description) lines.push(`- **Description**: ${layer.description}`);
    lines.push('');
  }
  
  lines.push('## Agents');
  lines.push('');
  for (const [name, role] of Object.entries(ARCHITECTURE.agents)) {
    lines.push(`- **${name}**: ${role}`);
  }
  
  lines.push('');
  lines.push('## Security');
  lines.push('');
  lines.push(`- **Gate**: ${ARCHITECTURE.security.gate}`);
  lines.push(`- **Encryption**: ${ARCHITECTURE.security.encryption}`);
  lines.push(`- **Integrity**: ${ARCHITECTURE.security.integrity}`);
  
  return lines.join('\n');
}

/**
 * Invoke a layer-specific tool (placeholder implementation)
 * In production, this would actually execute the underlying commands
 */
async function invokeLayerTool(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const tool = LAYER_TOOLS.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  
  const layer = ARCHITECTURE.layers.find(l => l.id === tool.layerId);
  const argString = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');
  
  return {
    content: [{
      type: 'text',
      text: `[MCP] Tool: ${name}\n` +
            `Layer ${tool.layerId}: ${layer?.name || 'Unknown'}\n` +
            `Command: ${tool.command}\n` +
            `Arguments: ${argString}\n` +
            `Status: EXECUTING (placeholder - actual implementation would invoke ${tool.command})`
    }]
  };
}

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

// Log server initialization
console.error(`Initializing ${SERVER_NAME} v${SERVER_VERSION}...`);
console.error(`Architecture: ${ARCHITECTURE.name} v${ARCHITECTURE.version}`);
console.error(`Layers: ${ARCHITECTURE.layers.length}`);
console.error(`Agents: ${Object.keys(ARCHITECTURE.agents).length}`);
console.error(`Tools: ${LAYER_TOOLS.length}`);
console.error('MCP Server ready. Waiting for connections...\n');

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
