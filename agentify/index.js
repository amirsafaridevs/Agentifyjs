/**
 * Agentify.js - Modular AI Agent Library
 * 
 * A browser-based AI agent library with streaming support,
 * flexible tool management, and comprehensive error handling.
 */

// Main class
export { Agentify } from './core/Agentify.js';

// Error classes
export {
  AgentifyError,
  SystemError,
  NetworkError,
  ModelError,
  ToolError,
  StreamError,
  StorageError
} from './errors/ErrorTypes.js';

// Managers (for advanced usage)
export { ConfigManager } from './core/ConfigManager.js';
export { ErrorManager } from './errors/ErrorManager.js';
export { ToolManager } from './tools/ToolManager.js';
export { InstructionManager } from './instructions/InstructionManager.js';
export { TaskManager } from './storage/TaskManager.js';
export { ChatHistoryManager } from './storage/ChatHistoryManager.js';
export { StreamHandler } from './streaming/StreamHandler.js';
export { ThinkingTracker } from './thinking/ThinkingTracker.js';
export { EventManager, EventTypes } from './events/EventManager.js';

// Adapters (for advanced usage)
export { BaseAdapter } from './providers/BaseAdapter.js';
export { OpenAIAdapter } from './providers/OpenAIAdapter.js';
export { AnthropicAdapter } from './providers/AnthropicAdapter.js';
export { GeminiAdapter } from './providers/GeminiAdapter.js';
export { CustomAdapter } from './providers/CustomAdapter.js';

// Utilities
export * as validators from './utils/validators.js';
export * as formatters from './utils/formatters.js';

// Default export
export { Agentify as default } from './core/Agentify.js';
