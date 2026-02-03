# Agentify.js 🤖

A powerful, modular AI agent library for browser-based applications with streaming support, flexible tool management, and comprehensive error handling.

## Features ✨

- **🎯 Modular Architecture**: Clean, class-based design with separated concerns
- **🔧 Flexible Tool System**: Define custom tools with file or text instructions
- **📝 Instruction Management**: Load system instructions from files or text
- **💾 Task Persistence**: Automatic task tracking using browser localStorage
- **⚡ Streaming Support**: Real-time streaming for both messages and tool calls
- **🧠 Thinking Mode**: Track what the model is doing in real-time
- **🚨 Comprehensive Error Handling**: Detailed error categorization and reporting
- **🔌 Multiple Providers**: Support for OpenAI, Anthropic, Gemini, DeepSeek, and custom APIs

## Installation

### Using as ES Module

```html
<script type="module">
  import { Agentify } from './agentify/index.js';
  
  const agent = new Agentify({
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-4'
  });
</script>
```

## Quick Start

### Basic Usage

```javascript
import { Agentify } from './agentify/index.js';

// Initialize agent
const agent = new Agentify({
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'your-api-key',
  model: 'gpt-4',
  stream: true
});

// Send a message
const response = await agent.chat('Hello!', {
  onToken: (token) => console.log(token),
  onComplete: (result) => console.log('Done:', result)
});
```

### With Configuration Methods

```javascript
const agent = new Agentify();

agent
  .setModel('gpt-4')
  .setApiUrl('https://api.openai.com/v1/chat/completions')
  .setApiKey('your-api-key')
  .setProvider('openai')
  .setTemperature(0.7);
```

## Core API

### Initialization

```javascript
const agent = new Agentify(config);
```

**Config Options:**
- `provider`: `'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom'`
- `apiUrl`: API endpoint URL
- `apiKey`: Your API key
- `model`: Model name (e.g., 'gpt-4', 'claude-3-opus')
- `temperature`: 0-2 (default: 0.7)
- `maxTokens`: Maximum tokens in response
- `stream`: Enable streaming (default: true)

### Configuration Methods

```javascript
agent.setModel(modelName)        // Set AI model
agent.setApiUrl(url)             // Set API endpoint
agent.setApiKey(key)             // Set API key
agent.setProvider(provider)      // Set provider
agent.setTemperature(temp)       // Set temperature (0-2)
agent.setMaxTokens(max)          // Set max tokens
```

### Instruction Management

```javascript
// Set instruction from text
agent.setInstruction('You are a helpful assistant...');

// Load from file (browser File object)
const file = document.getElementById('fileInput').files[0];
await agent.loadInstructionFromFile(file);

// Get current instruction
const instruction = agent.getInstruction();
```

### Tool Management

#### Adding a Single Tool

```javascript
await agent.addTool({
  name: 'get_weather',
  description: 'Get weather information for a location',
  instruction: 'Use this when user asks about weather',
  parameters: {
    location: { type: 'string', required: true },
    unit: { type: 'string', required: false }
  },
  execute: async (params) => {
    // Your tool logic here
    return { temp: 72, condition: 'sunny' };
  }
});
```

#### Tool with File Instruction

```javascript
const instructionFile = new File(['detailed instructions...'], 'tool.txt');

await agent.addTool({
  name: 'analyze_data',
  description: 'Analyze data',
  instructionFile: instructionFile,
  parameters: {
    data: { type: 'array', required: true }
  },
  execute: async (params) => {
    return { analysis: 'results' };
  }
});
```

#### Adding Multiple Tools

```javascript
await agent.addTools([tool1, tool2, tool3]);
```

### Chat with Streaming

```javascript
await agent.chat('Your message', {
  stream: true,
  
  // Called for each token
  onToken: (token) => {
    console.log('Token:', token);
  },
  
  // Called when tool is invoked
  onToolCall: (toolCall) => {
    console.log('Tool:', toolCall.name);
    console.log('Args:', toolCall.arguments);
  },
  
  // Called for thinking content
  onThinking: (thought) => {
    console.log('Thinking:', thought);
  },
  
  // Called when response is complete
  onComplete: (result) => {
    console.log('Content:', result.content);
    console.log('Tool Calls:', result.toolCalls);
  },
  
  // Called on error
  onError: (error) => {
    console.error('Error:', error.toConsole());
    document.getElementById('errors').innerHTML = error.toHTML();
  }
});
```

### Thinking Status Tracking

```javascript
// Subscribe to thinking status changes
const unsubscribe = agent.onThinkingChange((status) => {
  console.log('Is Thinking:', status.isThinking);
  console.log('Current Action:', status.currentAction);
  console.log('Progress:', status.progress);
  console.log('Step:', status.step);
  console.log('Elapsed Time:', status.elapsedTime);
});

// Get current status
const status = agent.getThinkingStatus();

// Unsubscribe when done
unsubscribe();
```

### Task Management

```javascript
// Get all tasks
const tasks = agent.getTasks();

// Get filtered tasks
const failedTasks = agent.getTasks({ 
  status: 'failed',
  since: '2024-01-01',
  limit: 10
});

// Get task statistics
const stats = agent.getTaskStats();
console.log('Total Tasks:', stats.totalTasks);
console.log('Storage Used:', stats.storageUsedFormatted);

// Export tasks for backend
const jsonData = agent.exportTasks('json');
const csvData = agent.exportTasks('csv');
const textData = agent.exportTasks('text');

// Send to backend
await fetch('/api/tasks', {
  method: 'POST',
  body: jsonData
});

// Clear all tasks
agent.clearTasks();
```

### Conversation History

```javascript
// Get conversation history
const history = agent.getHistory();

// Clear history
agent.clearHistory();
```

### Error Handling

```javascript
import { 
  SystemError, 
  NetworkError, 
  ModelError, 
  ToolError 
} from './agentify/index.js';

try {
  await agent.chat('Hello');
} catch (error) {
  // Check error type
  if (error instanceof SystemError) {
    console.error('System error:', error.details.location);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.details.statusCode);
  } else if (error instanceof ModelError) {
    console.error('Model error:', error.details.modelResponse);
  } else if (error instanceof ToolError) {
    console.error('Tool error:', error.details.toolName);
  }
  
  // Format for console
  console.error(error.toConsole());
  
  // Format for HTML display
  document.getElementById('errors').innerHTML = error.toHTML();
  
  // Serialize for backend
  const errorData = error.toJSON();
  await fetch('/api/errors', {
    method: 'POST',
    body: JSON.stringify(errorData)
  });
}

// Get error log
const errorLog = agent.getErrorLog();

// Clear error log
agent.clearErrorLog();
```

## Error Categories

### SystemError
Configuration, initialization, and validation issues
- `SYS_CONFIG_INVALID`: Invalid configuration
- `SYS_CONFIG_MISSING`: Missing required configuration
- `SYS_VALIDATION_FAILED`: Validation failure
- `SYS_INVALID_PARAMETER`: Invalid parameter

### NetworkError
API communication problems
- `NET_CONNECTION_FAILED`: Connection failure
- `NET_TIMEOUT`: Request timeout
- `NET_RATE_LIMIT`: Rate limit exceeded
- `NET_UNAUTHORIZED`: Invalid API key
- `NET_SERVER_ERROR`: Server error (500-504)

### ModelError
AI model response issues
- `MDL_INVALID_RESPONSE`: Invalid response format
- `MDL_RESPONSE_PARSE_FAILED`: Failed to parse response
- `MDL_CONTEXT_LENGTH_EXCEEDED`: Context too long

### ToolError
Tool execution failures
- `TOOL_NOT_FOUND`: Tool not registered
- `TOOL_EXEC_FAILED`: Execution failed
- `TOOL_INVALID_PARAMS`: Invalid parameters
- `TOOL_REGISTRATION_FAILED`: Registration failed

### StreamError
Streaming/parsing problems
- `STR_PARSE_FAILED`: Failed to parse stream
- `STR_CONNECTION_LOST`: Connection lost
- `STR_INVALID_FORMAT`: Invalid format

### StorageError
localStorage access issues
- `STG_QUOTA_EXCEEDED`: Storage quota exceeded
- `STG_NOT_AVAILABLE`: localStorage not available
- `STG_WRITE_FAILED`: Write operation failed

## Provider Support

### OpenAI

```javascript
const agent = new Agentify({
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4'
});
```

### Anthropic Claude

```javascript
const agent = new Agentify({
  provider: 'anthropic',
  apiUrl: 'https://api.anthropic.com/v1/messages',
  apiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229'
});
```

### Google Gemini

```javascript
const agent = new Agentify({
  provider: 'gemini',
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  apiKey: 'your-api-key',
  model: 'gemini-pro'
});
```

### DeepSeek

```javascript
const agent = new Agentify({
  provider: 'deepseek',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  apiKey: 'your-api-key',
  model: 'deepseek-chat'
});
```

### Custom API

```javascript
const agent = new Agentify({
  provider: 'custom',
  apiUrl: 'https://your-api.com/chat',
  apiKey: 'your-key',
  model: 'your-model'
});
```

## Advanced Usage

### Custom Provider Adapter

```javascript
import { BaseAdapter } from './agentify/index.js';

class MyCustomAdapter extends BaseAdapter {
  formatRequest(messages, tools, config) {
    // Format request for your API
    return { /* your format */ };
  }
  
  parseResponse(data) {
    // Parse your API response
    return {
      content: data.output,
      toolCalls: [],
      finishReason: 'stop'
    };
  }
}
```

### Direct Manager Access

```javascript
// Access managers directly for advanced usage
const configManager = agent.configManager;
const toolManager = agent.toolManager;
const taskManager = agent.taskManager;
const errorManager = agent.errorManager;

// Example: Get tool count
const toolCount = agent.toolManager.getToolCount();
```

### Agent Status

```javascript
const status = agent.getStatus();
console.log('Config:', status.config);
console.log('Message Count:', status.messageCount);
console.log('Tool Count:', status.toolCount);
console.log('Has Instruction:', status.hasInstruction);
console.log('Task Stats:', status.taskStats);
console.log('Thinking Status:', status.thinkingStatus);
console.log('Error Count:', status.errorCount);
```

## Examples

Check out the `examples/` directory for complete working examples:

- **basic-usage.html** - Simple chat with streaming
- **with-tools.html** - Using custom tools
- **streaming.html** - Real-time streaming demo
- **error-handling.html** - Comprehensive error handling

To run the examples:

1. Open any HTML file in a modern browser
2. Enter your API credentials
3. Start chatting!

## Architecture

```
agentify/
├── index.js                    # Main export
├── core/
│   ├── Agentify.js            # Main class
│   └── ConfigManager.js       # Configuration
├── tools/
│   └── ToolManager.js         # Tool registry
├── instructions/
│   └── InstructionManager.js  # Instructions
├── storage/
│   └── TaskManager.js         # Task persistence
├── streaming/
│   └── StreamHandler.js       # Stream processing
├── thinking/
│   └── ThinkingTracker.js     # Status tracking
├── errors/
│   ├── ErrorManager.js        # Error handling
│   └── ErrorTypes.js          # Error classes
├── providers/
│   ├── BaseAdapter.js         # Base adapter
│   ├── OpenAIAdapter.js
│   ├── AnthropicAdapter.js
│   ├── GeminiAdapter.js
│   └── CustomAdapter.js
└── utils/
    ├── validators.js          # Validation
    └── formatters.js          # Formatting
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Opera: ✅ Full support

Requires modern browser with:
- ES6 Modules support
- Fetch API
- localStorage
- ReadableStream (for streaming)

## Best Practices

### 1. Error Handling

Always wrap agent calls in try-catch:

```javascript
try {
  await agent.chat(message);
} catch (error) {
  console.error(error.toConsole());
}
```

### 2. Streaming

Use streaming for better UX:

```javascript
await agent.chat(message, {
  stream: true,
  onToken: (token) => updateUI(token)
});
```

### 3. Tool Instructions

Provide clear instructions for tools:

```javascript
await agent.addTool({
  name: 'search',
  description: 'Search for information',
  instruction: 'Use this tool when the user asks questions that require current information or facts',
  // ...
});
```

### 4. Task Management

Periodically export tasks to prevent storage issues:

```javascript
// Export weekly
const tasks = agent.exportTasks('json');
await sendToBackend(tasks);
agent.clearTasks();
```

### 5. Thinking Status

Show thinking status to users:

```javascript
agent.onThinkingChange((status) => {
  if (status.isThinking) {
    showLoader(status.currentAction);
  } else {
    hideLoader();
  }
});
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure your API endpoint allows requests from your origin.

### localStorage Quota

If storage quota is exceeded:
- Export tasks regularly
- Clear old tasks
- Reduce task retention

### Streaming Not Working

- Check browser compatibility
- Verify API supports streaming
- Check network connectivity

### Tools Not Executing

- Verify tool is registered: `agent.toolManager.hasTool(name)`
- Check tool parameters match schema
- Review error logs: `agent.getErrorLog()`

## License

MIT License - feel free to use in your projects!

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- All features are documented
- Examples are updated

## Support

For issues, questions, or feature requests, please open an issue on the repository.

---

Made with ❤️ using modern JavaScript
