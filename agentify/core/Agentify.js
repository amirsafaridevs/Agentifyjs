import { ConfigManager } from './ConfigManager.js';
import { ErrorManager } from '../errors/ErrorManager.js';
import { ToolManager } from '../tools/ToolManager.js';
import { InstructionManager } from '../instructions/InstructionManager.js';
import { TaskManager } from '../storage/TaskManager.js';
import { StreamHandler } from '../streaming/StreamHandler.js';
import { ThinkingTracker } from '../thinking/ThinkingTracker.js';
import { OpenAIAdapter } from '../providers/OpenAIAdapter.js';
import { AnthropicAdapter } from '../providers/AnthropicAdapter.js';
import { GeminiAdapter } from '../providers/GeminiAdapter.js';
import { CustomAdapter } from '../providers/CustomAdapter.js';
import { validateMessage } from '../utils/validators.js';
import { formatMessages } from '../utils/formatters.js';

/**
 * Main Agentify class - AI Agent with streaming, tools, and comprehensive error handling
 */
export class Agentify {
  constructor(config = {}) {
    // Initialize managers
    this.errorManager = new ErrorManager();
    this.configManager = new ConfigManager(config);
    this.toolManager = new ToolManager(this.errorManager);
    this.instructionManager = new InstructionManager(this.errorManager);
    this.taskManager = new TaskManager('agentify_tasks', this.errorManager);
    this.streamHandler = new StreamHandler(this.errorManager);
    this.thinkingTracker = new ThinkingTracker();

    // Conversation history
    this.messages = [];

    // Provider adapter
    this.adapter = null;
    this.initializeAdapter();
  }

  /**
   * Initialize provider adapter based on config
   */
  initializeAdapter() {
    const provider = this.configManager.get('provider');

    switch (provider) {
      case 'openai':
        this.adapter = new OpenAIAdapter(this.configManager, this.errorManager);
        break;
      case 'anthropic':
        this.adapter = new AnthropicAdapter(this.configManager, this.errorManager);
        break;
      case 'gemini':
        this.adapter = new GeminiAdapter(this.configManager, this.errorManager);
        break;
      case 'deepseek':
        this.adapter = new OpenAIAdapter(this.configManager, this.errorManager);
        break;
      default:
        this.adapter = new CustomAdapter(this.configManager, this.errorManager);
    }
  }

  /**
   * Set AI model
   */
  setModel(modelName) {
    this.configManager.set('model', modelName);
    return this;
  }

  /**
   * Set API URL
   */
  setApiUrl(url) {
    this.configManager.set('apiUrl', url);
    this.initializeAdapter(); // Reinitialize adapter with new URL
    return this;
  }

  /**
   * Set API key
   */
  setApiKey(key) {
    this.configManager.set('apiKey', key);
    return this;
  }

  /**
   * Set provider
   */
  setProvider(provider) {
    this.configManager.set('provider', provider);
    this.initializeAdapter();
    return this;
  }

  /**
   * Set temperature
   */
  setTemperature(temperature) {
    this.configManager.set('temperature', temperature);
    return this;
  }

  /**
   * Set max tokens
   */
  setMaxTokens(maxTokens) {
    this.configManager.set('maxTokens', maxTokens);
    return this;
  }

  /**
   * Add a single tool
   */
  async addTool(tool) {
    return await this.toolManager.registerTool(tool);
  }

  /**
   * Add multiple tools
   */
  async addTools(tools) {
    return await this.toolManager.registerTools(tools);
  }

  /**
   * Set instruction from text
   */
  setInstruction(instruction) {
    return this.instructionManager.setFromText(instruction);
  }

  /**
   * Load instruction from file
   */
  async loadInstructionFromFile(file) {
    return await this.instructionManager.loadFromFile(file);
  }

  /**
   * Subscribe to thinking status changes
   */
  onThinkingChange(callback) {
    return this.thinkingTracker.onStatusChange(callback);
  }

  /**
   * Get current thinking status
   */
  getThinkingStatus() {
    return this.thinkingTracker.getStatus();
  }

  /**
   * Get tasks from storage
   */
  getTasks(filter) {
    return this.taskManager.getTasks(filter);
  }

  /**
   * Export tasks
   */
  exportTasks(format = 'json') {
    return this.taskManager.exportTasks(format);
  }

  /**
   * Clear tasks
   */
  clearTasks() {
    return this.taskManager.clearTasks();
  }

  /**
   * Get task statistics
   */
  getTaskStats() {
    return this.taskManager.getStorageStats();
  }

  /**
   * Main chat method with streaming support
   */
  async chat(message, options = {}) {
    // Validate message
    validateMessage(message);

    // Validate configuration
    this.configManager.validateRequired();

    // Create task
    const task = this.taskManager.addTask({
      type: 'chat',
      status: 'pending',
      input: typeof message === 'string' ? message : JSON.stringify(message)
    });

    try {
      // Update thinking status
      this.thinkingTracker.startThinking('Preparing request');

      // Add message to history
      if (typeof message === 'string') {
        this.messages.push({ role: 'user', content: message });
      } else {
        this.messages.push(message);
      }

      // Format messages with system instruction
      const instruction = this.instructionManager.getInstruction();
      const formattedMessages = formatMessages(this.messages, instruction);

      // Get tool definitions
      const tools = this.toolManager.getToolCount() > 0
        ? this.toolManager.getToolDefinitions(this.configManager.get('provider'))
        : null;

      // Format request
      this.thinkingTracker.setAction('Formatting request');
      const config = this.configManager.getAll();
      const requestBody = this.adapter.formatRequest(formattedMessages, tools, config);

      // Update task status
      this.taskManager.updateTaskStatus(task.id, 'running', {
        startTime: new Date().toISOString()
      });

      // Make request
      this.thinkingTracker.setAction('Sending request to API');
      const response = await this.adapter.makeRequest(requestBody, config.stream);

      if (config.stream) {
        // Handle streaming response
        return await this.handleStreamingResponse(response, task, options);
      } else {
        // Handle non-streaming response
        return await this.handleNonStreamingResponse(response, task, options);
      }

    } catch (error) {
      // Update task with error
      this.taskManager.updateTaskStatus(task.id, 'failed', {
        error: error.toJSON ? error.toJSON() : { message: error.message },
        endTime: new Date().toISOString()
      });

      // Stop thinking
      this.thinkingTracker.stopThinking();

      // Call error callback if provided
      if (options.onError) {
        options.onError(error);
      }

      throw error;
    }
  }

  /**
   * Handle streaming response
   */
  async handleStreamingResponse(response, task, options) {
    this.thinkingTracker.setAction('Processing stream');

    const provider = this.configManager.get('provider');
    
    const callbacks = {
      onToken: (token) => {
        if (options.onToken) {
          options.onToken(token);
        }
      },
      onToolCall: async (toolCall) => {
        this.thinkingTracker.setAction(`Executing tool: ${toolCall.name}`);
        
        if (options.onToolCall) {
          options.onToolCall(toolCall);
        }

        // Execute tool if handler exists
        if (this.toolManager.hasTool(toolCall.name)) {
          try {
            const result = await this.toolManager.executeTool(
              toolCall.name,
              toolCall.arguments
            );
            return result;
          } catch (error) {
            console.error('Tool execution error:', error);
            throw error;
          }
        }
      },
      onThinking: (thought) => {
        if (options.onThinking) {
          options.onThinking(thought);
        }
      },
      onComplete: (result) => {
        // Add assistant message to history
        if (result.content) {
          this.messages.push({
            role: 'assistant',
            content: result.content
          });
        }

        // Update task
        this.taskManager.updateTaskStatus(task.id, 'completed', {
          output: result.content,
          endTime: new Date().toISOString(),
          duration: Date.now() - new Date(task.timestamp).getTime()
        });

        // Stop thinking
        this.thinkingTracker.stopThinking();

        if (options.onComplete) {
          options.onComplete(result);
        }
      },
      onError: (error) => {
        if (options.onError) {
          options.onError(error);
        }
      }
    };

    return await this.streamHandler.handleStream(response, callbacks, provider);
  }

  /**
   * Handle non-streaming response
   */
  async handleNonStreamingResponse(response, task, options) {
    this.thinkingTracker.setAction('Parsing response');

    const data = await response.json();
    const result = this.adapter.parseResponse(data);

    // Add assistant message to history
    if (result.content) {
      this.messages.push({
        role: 'assistant',
        content: result.content
      });
    }

    // Handle tool calls if present
    if (result.toolCalls && result.toolCalls.length > 0) {
      this.thinkingTracker.setAction('Processing tool calls');
      
      for (const toolCall of result.toolCalls) {
        if (options.onToolCall) {
          options.onToolCall(toolCall);
        }

        if (this.toolManager.hasTool(toolCall.name)) {
          try {
            await this.toolManager.executeTool(toolCall.name, toolCall.arguments);
          } catch (error) {
            console.error('Tool execution error:', error);
          }
        }
      }
    }

    // Update task
    this.taskManager.updateTaskStatus(task.id, 'completed', {
      output: result.content,
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(task.timestamp).getTime()
    });

    // Stop thinking
    this.thinkingTracker.stopThinking();

    if (options.onComplete) {
      options.onComplete(result);
    }

    return result;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
    return this;
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.messages];
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return this.errorManager.getErrorLog();
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    return this.errorManager.clearErrorLog();
  }

  /**
   * Get configuration
   */
  getConfig() {
    return this.configManager.getAll();
  }

  /**
   * Get all registered tools
   */
  getTools() {
    return this.toolManager.getAllTools();
  }

  /**
   * Remove a tool
   */
  removeTool(name) {
    return this.toolManager.removeTool(name);
  }

  /**
   * Get current instruction
   */
  getInstruction() {
    return this.instructionManager.getInstruction();
  }

  /**
   * Reset agent to initial state
   */
  reset() {
    this.messages = [];
    this.thinkingTracker.reset();
    this.instructionManager.clear();
    return this;
  }

  /**
   * Get agent status summary
   */
  getStatus() {
    return {
      config: this.configManager.getAll(),
      messageCount: this.messages.length,
      toolCount: this.toolManager.getToolCount(),
      hasInstruction: this.instructionManager.hasInstruction(),
      taskStats: this.taskManager.getStorageStats(),
      thinkingStatus: this.thinkingTracker.getStatus(),
      errorCount: this.errorManager.getErrorLog().length
    };
  }
}

export default Agentify;
