import { validateTool } from '../utils/validators.js';
import { formatToolParameters } from '../utils/formatters.js';
import { ToolError, SystemError } from '../errors/ErrorTypes.js';

/**
 * Manages tool registration and execution
 */
export class ToolManager {
  constructor(errorManager) {
    this.tools = new Map();
    this.errorManager = errorManager;
  }

  /**
   * Register a single tool
   */
  async registerTool(tool) {
    try {
      validateTool(tool);

      // Handle instruction from file if provided
      let instruction = tool.instruction || '';
      
      if (tool.instructionFile) {
        instruction = await this.loadInstructionFromFile(tool.instructionFile);
      }

      const toolDefinition = {
        name: tool.name,
        description: tool.description,
        instruction: instruction,
        parameters: tool.parameters || {},
        execute: tool.execute || null
      };

      this.tools.set(tool.name, toolDefinition);
      
      return toolDefinition;
    } catch (error) {
      if (error instanceof SystemError) {
        throw error;
      }
      throw this.errorManager.createToolError(
        `Failed to register tool: ${tool.name}`,
        ToolError.codes.REGISTRATION_FAILED,
        { toolName: tool.name, originalError: error.message }
      );
    }
  }

  /**
   * Register multiple tools
   */
  async registerTools(tools) {
    if (!Array.isArray(tools)) {
      throw this.errorManager.createSystemError(
        'Tools must be an array',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof tools }
      );
    }

    const results = [];
    for (const tool of tools) {
      try {
        const registered = await this.registerTool(tool);
        results.push({ success: true, tool: registered });
      } catch (error) {
        results.push({ success: false, tool: tool.name, error });
      }
    }

    return results;
  }

  /**
   * Load instruction from file
   */
  async loadInstructionFromFile(file) {
    return new Promise((resolve, reject) => {
      if (file instanceof File) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read instruction file'));
        };
        
        reader.readAsText(file);
      } else if (typeof file === 'string') {
        // Assume it's text content
        resolve(file);
      } else {
        reject(new Error('Invalid instruction file format'));
      }
    });
  }

  /**
   * Get tool by name
   */
  getTool(name) {
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw this.errorManager.createToolError(
        `Tool not found: ${name}`,
        ToolError.codes.NOT_FOUND,
        { toolName: name, availableTools: Array.from(this.tools.keys()) }
      );
    }

    return tool;
  }

  /**
   * Get all registered tools
   */
  getAllTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions formatted for API calls
   */
  getToolDefinitions(provider = 'openai') {
    const tools = Array.from(this.tools.values());
    
    switch (provider) {
      case 'openai':
      case 'deepseek':
        return tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name || '',
            description: (tool.description || '') + (tool.instruction ? `\n\n${tool.instruction}` : ''),
            parameters: formatToolParameters(tool.parameters)
          }
        }));
      
      case 'anthropic':
        return tools.map(tool => ({
          name: tool.name || '',
          description: (tool.description || '') + (tool.instruction ? `\n\n${tool.instruction}` : ''),
          input_schema: formatToolParameters(tool.parameters)
        }));
      
      case 'gemini':
        return tools.map(tool => ({
          name: tool.name || '',
          description: (tool.description || '') + (tool.instruction ? `\n\n${tool.instruction}` : ''),
          parameters: formatToolParameters(tool.parameters)
        }));
      
      default:
        return tools.map(tool => ({
          name: tool.name || '',
          description: (tool.description || '') + (tool.instruction ? `\n\n${tool.instruction}` : ''),
          parameters: formatToolParameters(tool.parameters)
        }));
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(name, parameters) {
    const tool = this.getTool(name);

    if (!tool.execute) {
      throw this.errorManager.createToolError(
        `Tool ${name} has no execute function`,
        ToolError.codes.EXEC_FAILED,
        { toolName: name }
      );
    }

    try {
      // Validate parameters against tool schema
      this.validateToolParameters(tool, parameters);

      const startTime = Date.now();
      const result = await Promise.race([
        tool.execute(parameters),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tool execution timeout')), 30000)
        )
      ]);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        duration,
        toolName: name
      };
    } catch (error) {
      throw this.errorManager.createToolError(
        `Tool execution failed: ${name}`,
        ToolError.codes.EXEC_FAILED,
        {
          toolName: name,
          parameters,
          originalError: error.message,
          stack: error.stack
        }
      );
    }
  }

  /**
   * Validate tool parameters
   */
  validateToolParameters(tool, parameters) {
    const schema = tool.parameters;
    
    if (!schema || Object.keys(schema).length === 0) {
      return true;
    }

    for (const [key, definition] of Object.entries(schema)) {
      const value = parameters[key];
      const isRequired = definition.required === true;

      if (isRequired && (value === undefined || value === null)) {
        throw this.errorManager.createToolError(
          `Missing required parameter: ${key}`,
          ToolError.codes.INVALID_PARAMS,
          {
            toolName: tool.name,
            parameter: key,
            provided: parameters
          }
        );
      }

      if (value !== undefined && definition.type) {
        const expectedType = definition.type;
        const actualType = typeof value;

        if (expectedType === 'array' && !Array.isArray(value)) {
          throw this.errorManager.createToolError(
            `Parameter ${key} must be an array`,
            ToolError.codes.INVALID_PARAMS,
            {
              toolName: tool.name,
              parameter: key,
              expectedType,
              actualType
            }
          );
        }
        if (expectedType === 'string' && actualType === 'number') {
          parameters[key] = String(value);
        } else if (expectedType !== 'array' && actualType !== expectedType) {
          throw this.errorManager.createToolError(
            `Parameter ${key} has wrong type`,
            ToolError.codes.INVALID_PARAMS,
            {
              toolName: tool.name,
              parameter: key,
              expectedType,
              actualType
            }
          );
        }
      }
    }

    return true;
  }

  /**
   * Remove a tool
   */
  removeTool(name) {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    return existed;
  }

  /**
   * Clear all tools
   */
  clearTools() {
    this.tools.clear();
  }

  /**
   * Check if tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Get tool count
   */
  getToolCount() {
    return this.tools.size;
  }
}

export default ToolManager;
