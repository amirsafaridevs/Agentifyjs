import { ConfigManager } from './ConfigManager.js';
import { ErrorManager } from '../errors/ErrorManager.js';
import { ToolManager } from '../tools/ToolManager.js';
import { InstructionManager } from '../instructions/InstructionManager.js';
import { TaskManager } from '../storage/TaskManager.js';
import { ChatHistoryManager } from '../storage/ChatHistoryManager.js';
import { StreamHandler } from '../streaming/StreamHandler.js';
import { ThinkingTracker } from '../thinking/ThinkingTracker.js';
import { EventManager } from '../events/EventManager.js';
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
    this.chatHistoryManager = new ChatHistoryManager('agentify_chat_history', this.errorManager);
    this.streamHandler = new StreamHandler(this.errorManager);
    this.thinkingTracker = new ThinkingTracker();
    this.eventManager = new EventManager('agentify_events', this.errorManager);

    // Conversation history (current session - kept for backward compatibility)
    this.messages = [];
    
    // Chat history settings
    this.useHistory = config.useHistory !== false; // Default: true
    this.maxHistoryMessages = config.maxHistoryMessages || 50; // Default: 50 messages
    this.includeHistory = config.includeHistory !== false; // Default: true

    // Provider adapter
    this.adapter = null;
    this.initializeAdapter();

    // Log initialization
    this.eventManager.logEvent('agent_initialized', {
      config: this.configManager.getAll(),
      timestamp: new Date().toISOString()
    });
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
    // Skip validation for tool followup (message can be empty)
    if (!options._isToolFollowUp) {
      try {
        validateMessage(message);
      } catch (validationError) {
        // Validation failed - return helpful error message
        if (options.onError) {
          options.onError(validationError);
        }
        return {
          content: `I encountered a validation error: ${validationError.message}. Please provide a valid message.`,
          error: validationError,
          toolCalls: [],
          finishReason: 'error'
        };
      }
    }

    // Validate configuration
    try {
      this.configManager.validateRequired();
    } catch (configError) {
      if (options.onError) {
        options.onError(configError);
      }
      return {
        content: `Configuration error: ${configError.message}. Please check API key and model settings.`,
        error: configError,
        toolCalls: [],
        finishReason: 'error'
      };
    }

    // Prevent infinite tool call loops
    const maxToolRounds = options.maxToolRounds || 10;
    const currentRound = options._toolRound || 0;
    
    if (currentRound >= maxToolRounds) {
      const loopError = this.errorManager.createSystemError(
        `Maximum tool call rounds (${maxToolRounds}) exceeded. This may indicate a tool calling loop.`,
        'MAX_TOOL_ROUNDS_EXCEEDED',
        { maxToolRounds, currentRound }
      );
      
      if (options.onError) {
        options.onError(loopError);
      }
      
      return {
        content: `I've reached the maximum number of tool calls (${maxToolRounds}). Let me provide you with what I have so far instead of continuing the loop.`,
        error: loopError,
        toolCalls: [],
        finishReason: 'max_rounds'
      };
    }

    // Generate or use provided chat ID, or keep existing one
    const chatId = options.chatId || this.eventManager.getChatId() || this.eventManager.generateChatId();
    this.eventManager.setChatId(chatId);

    // Log user message (skip if tool followup)
    if (!options._isToolFollowUp) {
      this.eventManager.logUserMessage(message, { chatId });
    }

    // Create task
    const task = this.taskManager.addTask({
      type: options._isToolFollowUp ? 'tool_followup' : 'chat',
      status: 'pending',
      input: typeof message === 'string' ? message : JSON.stringify(message)
    });

    const startTime = Date.now();

    try {
      // Update thinking status
      this.thinkingTracker.startThinking(options._isToolFollowUp ? 'Processing tool results' : 'Preparing request');
      this.eventManager.logThinkingStarted(options._isToolFollowUp ? 'Processing tool results' : 'Preparing request', { chatId });

      // Add user message to current session (skip if tool followup)
      if (!options._isToolFollowUp && message) {
        const userMessage = typeof message === 'string' 
          ? { role: 'user', content: message }
          : message;
        
        this.messages.push(userMessage);

        // Save to persistent history if enabled
        if (this.useHistory) {
          this.chatHistoryManager.addMessage(chatId, userMessage);
        }
      }

      // Build messages for API
      let messagesToSend = [];
      
      if (this.includeHistory && this.useHistory) {
        // Get full chat history from storage
        const historyMessages = this.chatHistoryManager.getContextWindow(
          chatId, 
          this.maxHistoryMessages
        );
        messagesToSend = historyMessages;
      } else {
        // Use only current session messages (preserve all fields for tool messages)
        messagesToSend = this.messages.map(msg => {
          const formatted = { role: msg.role, content: msg.content };
          if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;
          if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
          return formatted;
        });
      }

      // Get tool definitions
      const tools = this.toolManager.getToolCount() > 0
        ? this.toolManager.getToolDefinitions(this.configManager.get('provider'))
        : null;

      // Build system instruction with tool info
      let instruction = this.instructionManager.getInstruction();
      if (tools && tools.length > 0) {
        const toolsList = tools.map(t => {
          const fn = t.function || t;
          return `- ${fn.name}: ${fn.description}`;
        }).join('\n');
        instruction = instruction + `\n\nAvailable tools:\n${toolsList}\n\nUse these tools when appropriate to help answer user questions.`;
      }

      // Format messages with system instruction
      const formattedMessages = formatMessages(messagesToSend, instruction);

      // Format request
      this.thinkingTracker.setAction('Formatting request');
      const config = this.configManager.getAll();
      const requestBody = this.adapter.formatRequest(formattedMessages, tools, config);

      // Update task status
      this.taskManager.updateTaskStatus(task.id, 'running', {
        startTime: new Date().toISOString()
      });

      // Log API request
      this.eventManager.logApiRequest(
        config.apiUrl,
        'POST',
        { model: config.model, messages: formattedMessages.length, tools: tools?.length || 0 },
        { chatId }
      );

      // Make request
      this.thinkingTracker.setAction('Sending request to API');
      const response = await this.adapter.makeRequest(requestBody, config.stream);

      // Log assistant message started
      this.eventManager.logAssistantMessageStarted({ chatId });

      if (config.stream) {
        // Handle streaming response
        return await this.handleStreamingResponse(response, task, options, chatId, startTime);
      } else {
        // Handle non-streaming response
        return await this.handleNonStreamingResponse(response, task, options, chatId, startTime);
      }

    } catch (error) {
      // Log error
      this.eventManager.logError(error, 'chat', { chatId });

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

      // Determine if this is a recoverable error
      const isRecoverable = error.code !== 'ECONNREFUSED' && 
                           error.code !== 'ENOTFOUND' && 
                           error.name !== 'TypeError';

      // Build helpful error response
      let errorContent = `I encountered an error: ${error.message}`;
      
      if (error.code === 401 || error.code === 'UNAUTHORIZED') {
        errorContent = 'Authentication failed. Please check your API key.';
      } else if (error.code === 429 || error.code === 'RATE_LIMIT') {
        errorContent = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.code === 500 || error.code === 'SERVER_ERROR') {
        errorContent = 'The AI service is experiencing issues. Please try again in a moment.';
      } else if (isRecoverable) {
        errorContent += '\n\nWould you like to try rephrasing your request or asking something else?';
      }

      // Return error as response instead of throwing (for recoverable errors)
      if (isRecoverable || options._isToolFollowUp) {
        return {
          content: errorContent,
          error: error,
          toolCalls: [],
          finishReason: 'error'
        };
      }

      // For critical errors, still throw
      throw error;
    }
  }

  /**
   * Handle streaming response
   */
  async handleStreamingResponse(response, task, options, chatId, startTime) {
    this.thinkingTracker.setAction('Processing stream');
    this.eventManager.logEvent('stream_started', { chatId });

    const provider = this.configManager.get('provider');
    const currentRound = options._toolRound || 0;
    
    const callbacks = {
      onToken: (token) => {
        // Log token (optional - can generate many events)
        // this.eventManager.logToken(token);
        
        if (options.onToken) {
          options.onToken(token);
        }
      },
      onToolCall: async (toolCall) => {
        this.thinkingTracker.setAction(`Executing tool: ${toolCall.name}`);
        
        // Log tool call initiated
        this.eventManager.logToolCallInitiated(
          toolCall.name,
          toolCall.arguments,
          { chatId }
        );
        
        if (options.onToolCall) {
          options.onToolCall(toolCall);
        }

        // Parse arguments if string
        let parsedArgs = toolCall.arguments;
        if (typeof parsedArgs === 'string') {
          try {
            parsedArgs = JSON.parse(parsedArgs);
          } catch (e) {
            const errorMsg = `Failed to parse tool arguments: ${e.message}`;
            this.eventManager.logError(new Error(errorMsg), 'tool', { chatId });
            return {
              success: false,
              error: errorMsg,
              toolName: toolCall.name
            };
          }
        }

        // Execute tool if handler exists
        if (this.toolManager.hasTool(toolCall.name)) {
          const toolStartTime = Date.now();
          try {
            const result = await this.toolManager.executeTool(
              toolCall.name,
              parsedArgs
            );
            
            // Log tool call completed
            this.eventManager.logToolCallCompleted(
              toolCall.name,
              parsedArgs,
              result.result,
              Date.now() - toolStartTime,
              { chatId }
            );
            
            return result;
          } catch (error) {
            this.eventManager.logToolCallFailed(
              toolCall.name,
              parsedArgs,
              error,
              { chatId }
            );
            this.eventManager.logError(error, 'tool', { chatId });
            
            // Return error instead of throwing - let model handle it
            return {
              success: false,
              error: error.message || String(error),
              toolName: toolCall.name
            };
          }
        } else {
          // Tool not found - return error instead of throwing
          const errorMsg = `Tool "${toolCall.name}" not found. Available tools: ${Array.from(this.toolManager.getAllTools().map(t => t.name)).join(', ')}`;
          this.eventManager.logError(new Error(errorMsg), 'tool', { chatId });
          return {
            success: false,
            error: errorMsg,
            toolName: toolCall.name
          };
        }
      },
      onThinking: (thought) => {
        if (options.onThinking) {
          options.onThinking(thought);
        }
      },
      onComplete: (result) => {
        const duration = Date.now() - startTime;
        
        // Add assistant message to current session
        const assistantMessage = {
          role: 'assistant',
          content: result.content
        };
        
        if (result.content) {
          this.messages.push(assistantMessage);
          
          // Save to persistent history if enabled
          if (this.useHistory) {
            this.chatHistoryManager.addMessage(chatId, assistantMessage);
          }
        }

        // Log assistant message completed
        this.eventManager.logAssistantMessageCompleted(
          result.content,
          duration,
          { chatId, finishReason: result.finishReason }
        );

        // Log API response
        this.eventManager.logApiResponse(
          this.configManager.get('apiUrl'),
          200,
          { contentLength: result.content?.length || 0, finishReason: result.finishReason },
          duration,
          { chatId }
        );

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
        this.eventManager.logError(error, 'stream', { chatId });
        
        if (options.onError) {
          options.onError(error);
        }
      }
    };

    const streamResult = await this.streamHandler.handleStream(response, callbacks, provider);
    
    // If we have tool results, send them back to model for continuation
    if (streamResult.toolResults && streamResult.toolResults.length > 0) {
      this.thinkingTracker.setAction('Sending tool results to model');
      
      // Add assistant message with tool_calls
      const assistantWithTools = {
        role: 'assistant',
        content: streamResult.content || null,
        tool_calls: streamResult.toolCalls.map((tc, i) => ({
          id: tc.id || `call_${i}`,
          type: 'function',
          function: {
            name: tc.name,
            arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
          }
        }))
      };
      this.messages.push(assistantWithTools);
      if (this.useHistory) {
        this.chatHistoryManager.addMessage(chatId, assistantWithTools);
      }
      
      // Add tool results
      for (const { toolCall, result: toolResult } of streamResult.toolResults) {
        const toolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id || `call_${streamResult.toolResults.indexOf({ toolCall, result: toolResult })}`,
          content: JSON.stringify(toolResult.success !== false ? toolResult.result : { error: toolResult.error })
        };
        this.messages.push(toolMessage);
        if (this.useHistory) {
          this.chatHistoryManager.addMessage(chatId, toolMessage);
        }
      }
      
      // Continue conversation with tool results
      // Model may call more tools or provide final answer
      return await this.chat('', {
        ...options,
        chatId,
        _isToolFollowUp: true,
        _toolRound: currentRound + 1
      });
    }
    
    // No tool calls - this is final answer
    return streamResult;
  }

  /**
   * Handle non-streaming response
   */
  async handleNonStreamingResponse(response, task, options, chatId, startTime) {
    this.thinkingTracker.setAction('Parsing response');

    const data = await response.json();
    const result = this.adapter.parseResponse(data);
    const duration = Date.now() - startTime;

    // Log API response
    this.eventManager.logApiResponse(
      this.configManager.get('apiUrl'),
      200,
      { contentLength: result.content?.length || 0, toolCalls: result.toolCalls?.length || 0 },
      duration,
      { chatId }
    );

    // Add assistant message to current session
    const assistantMessage = {
      role: 'assistant',
      content: result.content
    };
    
    if (result.content) {
      this.messages.push(assistantMessage);
      
      // Save to persistent history if enabled
      if (this.useHistory) {
        this.chatHistoryManager.addMessage(chatId, assistantMessage);
      }
    }

    // Log assistant message completed
    this.eventManager.logAssistantMessageCompleted(
      result.content,
      duration,
      { chatId, finishReason: result.finishReason }
    );

    // Handle tool calls if present
    if (result.toolCalls && result.toolCalls.length > 0) {
      this.thinkingTracker.setAction('Processing tool calls');
      
      for (const toolCall of result.toolCalls) {
        // Log tool call initiated
        this.eventManager.logToolCallInitiated(
          toolCall.name,
          toolCall.arguments,
          { chatId }
        );
        
        if (options.onToolCall) {
          options.onToolCall(toolCall);
        }

        if (this.toolManager.hasTool(toolCall.name)) {
          const toolStartTime = Date.now();
          try {
            const toolResult = await this.toolManager.executeTool(toolCall.name, toolCall.arguments);
            
            // Log tool call completed
            this.eventManager.logToolCallCompleted(
              toolCall.name,
              toolCall.arguments,
              toolResult.result,
              Date.now() - toolStartTime,
              { chatId }
            );
          } catch (error) {
            // Log tool call failed
            this.eventManager.logToolCallFailed(
              toolCall.name,
              toolCall.arguments,
              error,
              { chatId }
            );
            
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
      errorCount: this.errorManager.getErrorLog().length,
      eventStats: this.eventManager.getStorageStats()
    };
  }

  // ==================== Event Management Methods ====================

  /**
   * Get all events with optional filtering
   */
  getEvents(filter) {
    return this.eventManager.getEvents(filter);
  }

  /**
   * Get events by chat ID
   */
  getEventsByChatId(chatId) {
    return this.eventManager.getEventsByChatId(chatId);
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.eventManager.getEventsByType(type);
  }

  /**
   * Get chat timeline
   */
  getChatTimeline(chatId) {
    return this.eventManager.getChatTimeline(chatId);
  }

  /**
   * Export events
   */
  exportEvents(format = 'json', filter = {}) {
    return this.eventManager.exportEvents(format, filter);
  }

  /**
   * Clear all events
   */
  clearEvents() {
    return this.eventManager.clearEvents();
  }

  /**
   * Delete events by chat ID
   */
  deleteEventsByChatId(chatId) {
    return this.eventManager.deleteEventsByChatId(chatId);
  }

  /**
   * Delete old events
   */
  deleteOldEvents(olderThan) {
    return this.eventManager.deleteOldEvents(olderThan);
  }

  /**
   * Get event statistics
   */
  getEventStats() {
    return this.eventManager.getStorageStats();
  }

  /**
   * Get all chat IDs
   */
  getChatIds() {
    return this.eventManager.getChatIds();
  }

  /**
   * Set chat ID for current conversation
   */
  setChatId(chatId) {
    this.eventManager.setChatId(chatId);
    return this;
  }

  /**
   * Get current chat ID
   */
  getCurrentChatId() {
    return this.eventManager.getChatId();
  }

  /**
   * Generate new chat ID
   */
  generateNewChatId() {
    return this.eventManager.generateChatId();
  }

  // ==================== Chat History Management Methods ====================

  /**
   * Enable/disable history usage
   */
  setUseHistory(enabled) {
    this.useHistory = enabled;
    return this;
  }

  /**
   * Set maximum history messages to include in context
   */
  setMaxHistoryMessages(max) {
    this.maxHistoryMessages = max;
    return this;
  }

  /**
   * Enable/disable including history in API calls
   */
  setIncludeHistory(enabled) {
    this.includeHistory = enabled;
    return this;
  }

  /**
   * Get chat history by ID
   */
  getChatHistory(chatId) {
    return this.chatHistoryManager.getChatHistory(chatId);
  }

  /**
   * Get messages from a chat
   */
  getChatMessages(chatId, options) {
    return this.chatHistoryManager.getMessages(chatId, options);
  }

  /**
   * Get last N messages from a chat
   */
  getLastChatMessages(chatId, count = 10) {
    return this.chatHistoryManager.getLastMessages(chatId, count);
  }

  /**
   * Clear chat history
   */
  clearChatHistory(chatId) {
    return this.chatHistoryManager.clearChatHistory(chatId);
  }

  /**
   * Clear all chat histories
   */
  clearAllChatHistories() {
    return this.chatHistoryManager.clearAllHistories();
  }

  /**
   * Get all chat IDs from history
   */
  getAllHistoryChatIds() {
    return this.chatHistoryManager.getAllChatIds();
  }

  /**
   * Check if chat exists in history
   */
  chatHistoryExists(chatId) {
    return this.chatHistoryManager.chatExists(chatId);
  }

  /**
   * Get message count for a chat
   */
  getChatMessageCount(chatId) {
    return this.chatHistoryManager.getMessageCount(chatId);
  }

  /**
   * Search messages in a chat
   */
  searchChatMessages(chatId, query, options) {
    return this.chatHistoryManager.searchMessages(chatId, query, options);
  }

  /**
   * Export chat history
   */
  exportChatHistory(chatId, format = 'json') {
    return this.chatHistoryManager.exportChatHistory(chatId, format);
  }

  /**
   * Import chat history
   */
  importChatHistory(chatId, data, format = 'json') {
    return this.chatHistoryManager.importChatHistory(chatId, data, format);
  }

  /**
   * Get chat history statistics
   */
  getChatHistoryStats() {
    return this.chatHistoryManager.getStorageStats();
  }

  /**
   * Load and continue existing chat
   */
  async continueChat(chatId, message, options = {}) {
    // Set the chat ID
    this.setChatId(chatId);
    
    // Load existing history into current session
    const history = this.getChatHistory(chatId);
    this.messages = history.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Continue with the chat
    return await this.chat(message, { ...options, chatId });
  }

  /**
   * Start new chat (clears current session)
   */
  async startNewChat(message, options = {}) {
    // Generate new chat ID
    const chatId = this.generateNewChatId();
    
    // Clear current session
    this.messages = [];
    
    // Start chat
    return await this.chat(message, { ...options, chatId });
  }

  /**
   * Merge multiple chats
   */
  mergeChats(targetChatId, sourceChatIds) {
    return this.chatHistoryManager.mergeChats(targetChatId, sourceChatIds);
  }

  /**
   * Get context window for a chat
   */
  getContextWindow(chatId, maxMessages = null) {
    return this.chatHistoryManager.getContextWindow(chatId, maxMessages || this.maxHistoryMessages);
  }

  // ==================== Storage & Configuration Management ====================

  /**
   * Clear all storage (tasks, events, chat histories)
   * WARNING: This will delete all data!
   */
  clearAllStorage() {
    this.clearTasks();
    this.clearEvents();
    this.clearAllChatHistories();
    this.clearHistory();
    this.clearErrorLog();
    return this;
  }

  /**
   * Reset configuration to defaults
   * Note: Does not clear API key for security
   */
  resetConfiguration() {
    this.configManager.set('temperature', 0.7);
    this.configManager.set('maxTokens', null);
    this.configManager.set('stream', true);
    this.configManager.set('model', null);
    return this;
  }

  /**
   * Clear sensitive data (API key, custom headers)
   */
  clearSensitiveData() {
    this.configManager.set('apiKey', null);
    this.configManager.set('customHeaders', {});
    return this;
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    const taskStats = this.getTaskStats();
    const eventStats = this.getEventStats();
    const chatStats = this.getChatHistoryStats();

    return {
      tasks: {
        count: taskStats.totalTasks,
        sizeBytes: taskStats.storageUsed,
        sizeFormatted: taskStats.storageUsedFormatted
      },
      events: {
        count: eventStats.totalEvents,
        sizeBytes: eventStats.storageUsed,
        sizeFormatted: eventStats.storageUsedFormatted
      },
      chatHistories: {
        count: chatStats.totalChats,
        messages: chatStats.totalMessages,
        sizeBytes: chatStats.storageUsed,
        sizeFormatted: chatStats.storageUsedFormatted
      },
      total: {
        sizeBytes: taskStats.storageUsed + eventStats.storageUsed + chatStats.storageUsed,
        sizeFormatted: this.formatBytes(taskStats.storageUsed + eventStats.storageUsed + chatStats.storageUsed)
      }
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default Agentify;
