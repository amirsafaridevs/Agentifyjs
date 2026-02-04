# Agentify.js 🤖

A powerful, modular, and resilient AI agent library for browser-based applications with streaming support, intelligent tool management, graceful error recovery, and comprehensive conversation tracking.

## ✨ Key Features

### 🎯 Core Architecture
- **Modular Design**: Clean, class-based architecture with separated concerns
- **Multiple AI Providers**: OpenAI, Anthropic, Gemini, DeepSeek, and custom APIs
- **Browser-Native**: Pure JavaScript ES modules, no build step required
- **Type-Safe**: Comprehensive parameter validation and type checking

### 🔧 Intelligent Tool System
- **Dynamic Tool Registration**: Define custom tools with flexible parameters
- **Continuous Tool Calling**: AI can chain multiple tools automatically
- **Error Recovery**: Tools failures don't stop execution - AI adapts
- **File or Text Instructions**: Load tool instructions from files or inline text
- **Parameter Coercion**: Automatic type conversion for common mismatches

### 💬 Advanced Conversation Management
- **Persistent Chat History**: Full conversation context saved to localStorage
- **Multi-Chat Support**: Manage multiple separate conversations
- **Context Window Control**: Configurable message limits for API calls
- **History Search**: Search through past conversations
- **Export/Import**: Save and restore conversations in multiple formats

### ⚡ Real-Time Streaming
- **Token-by-Token Streaming**: Real-time response generation
- **Tool Call Streaming**: Live tool execution updates
- **Thinking Status**: Track AI's current action and progress
- **Progress Indicators**: Show elapsed time and steps

### 🛡️ Resilient Error Handling
- **Graceful Degradation**: Errors never stop the conversation
- **Error Recovery**: AI receives error context and can retry
- **Categorized Errors**: System, Network, Model, Tool, Stream, Storage
- **Multiple Output Formats**: Console, HTML, JSON for logging
- **Detailed Context**: Stack traces, error codes, and metadata

### 📊 Comprehensive Logging
- **Event Tracking**: Every interaction logged with timestamps
- **Chat Timeline**: Complete history of events per conversation
- **Event Statistics**: Storage usage, event counts, unique chats
- **Export Options**: JSON, CSV, HTML table formats
- **Persian Date Support**: Shamsi calendar in event logs

### 💾 Storage Management
- **Task Persistence**: Automatic task tracking in localStorage
- **Storage Monitoring**: Track usage and prevent quota issues
- **Bulk Export**: Send tasks and history to backend systems
- **Cleanup Tools**: Clear old data, specific chats, or everything

## 📦 Installation

### Using as ES Module (No Build Required!)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Agentify Demo</title>
</head>
<body>
    <script type="module">
        import { Agentify } from './agentify/index.js';
        
        const agent = new Agentify({
            provider: 'openai',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'your-api-key',
            model: 'gpt-4'
        });
        
        // Start chatting!
        await agent.chat('Hello, world!');
    </script>
</body>
</html>
```

### Serving Locally

**Python (built-in):**
```bash
python -m http.server 8080
# or
py -m http.server 8080
```

**PHP (built-in):**
```bash
php -S 127.0.0.1:8080
```

**Node.js:**
```bash
npx http-server -p 8080 -c-1
```

## 🚀 Quick Start

### Basic Chat

```javascript
import { Agentify } from './agentify/index.js';

const agent = new Agentify({
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-...',
    model: 'gpt-4',
    stream: true
});

// Simple message
await agent.chat('What is the meaning of life?');

// With streaming callbacks
await agent.chat('Tell me a story', {
    onToken: (token) => {
        document.getElementById('output').textContent += token;
    },
    onComplete: (result) => {
        console.log('Done!', result);
    }
});
```

### Configuration Methods

```javascript
const agent = new Agentify();

// Chainable configuration
agent
    .setModel('gpt-4')
    .setApiUrl('https://api.openai.com/v1/chat/completions')
    .setApiKey('your-api-key')
    .setProvider('openai')
    .setTemperature(0.7)
    .setMaxTokens(2000);

// Or pass config object
agent.configure({
    model: 'gpt-4',
    apiKey: 'your-api-key',
    temperature: 0.7
});

// Configuration management
agent.resetConfiguration();      // Reset to defaults (keeps API key)
agent.clearSensitiveData();      // Clear API key and headers
agent.clearAllStorage();         // Clear all storage data
```

### Complete Configuration API

| Method | Description |
|--------|-------------|
| `setModel(model)` | Set AI model name |
| `setApiUrl(url)` | Set API endpoint |
| `setApiKey(key)` | Set API key |
| `setProvider(provider)` | Set provider ('openai', 'anthropic', etc.) |
| `setTemperature(temp)` | Set temperature (0-2) |
| `setMaxTokens(tokens)` | Set max response tokens |
| `setUseHistory(bool)` | Enable/disable history saving |
| `setIncludeHistory(bool)` | Enable/disable sending history to model |
| `setMaxHistoryMessages(num)` | Set context window size (default: 50) |
| `configure(config)` | Set multiple config options |
| `resetConfiguration()` | Reset to default settings |
| `clearSensitiveData()` | Clear API key and headers |
| `clearAllStorage()` | Delete all stored data |
| `getStorageInfo()` | Get storage usage details |

```

## 🔧 Tool System

### Defining Tools

```javascript
// Simple tool
await agent.addTool({
    name: 'calculate',
    description: 'Perform mathematical calculations',
    instruction: 'Use this when user asks for math operations. Supports +, -, *, /, %, **',
    parameters: {
        expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate',
            required: true
        }
    },
    execute: async (params) => {
        try {
            const result = eval(params.expression);
            return { result, expression: params.expression };
        } catch (error) {
            return { error: 'Invalid expression' };
        }
    }
});

// Tool with file instruction
const instructionFile = new File(
    ['Detailed instructions for this tool...'], 
    'tool-instruction.txt'
);

await agent.addTool({
    name: 'complex_tool',
    description: 'Complex data analysis',
    instructionFile: instructionFile,  // Load from file
    parameters: {
        data: { type: 'array', required: true },
        method: { type: 'string', required: false }
    },
    execute: async (params) => {
        // Tool implementation
        return { analysis: 'results' };
    }
});

// Multiple tools at once
await agent.addTools([tool1, tool2, tool3]);
```

### Tool Parameter Types

```javascript
parameters: {
    // String
    name: {
        type: 'string',
        description: 'User name',
        required: true
    },
    
    // Number
    age: {
        type: 'number',
        description: 'User age',
        required: true
    },
    
    // Boolean
    active: {
        type: 'boolean',
        description: 'Is active',
        required: false
    },
    
    // Array
    items: {
        type: 'array',
        description: 'List of items',
        items: { type: 'string' },
        required: true
    },
    
    // Object
    config: {
        type: 'object',
        description: 'Configuration object',
        properties: {
            key: { type: 'string' }
        },
        required: false
    }
}
```

### Continuous Tool Calling

The AI can automatically chain multiple tools to complete complex tasks:

```javascript
// User: "Calculate 2+2, then 5*3, then 10-4"

// AI will automatically:
// 1. Call calculate tool with "2+2" → Result: 4
// 2. Call calculate tool with "5*3" → Result: 15
// 3. Call calculate tool with "10-4" → Result: 6
// 4. Respond: "The results are 4, 15, and 6"

await agent.chat('Calculate 2+2, then 5*3, then 10-4', {
    onToolCall: (toolCall) => {
        console.log(`Calling tool: ${toolCall.name}`);
    },
    maxToolRounds: 10  // Prevent infinite loops (default: 10)
});
```

### Tool Error Recovery

If a tool fails, the AI receives the error and can recover:

```javascript
// Scenario 1: Tool not found
// User: "Use calculator_wrong tool to add 2+2"
// AI: "That tool doesn't exist. Let me use the correct 'calculate' tool instead."

// Scenario 2: Invalid parameters
// User: "Calculate xyz"
// AI receives: {error: "Invalid expression"}
// AI: "That's not a valid expression. Try something like '2+2' or '10*5'."

// Scenario 3: Tool execution error
// AI receives error context, suggests alternatives
```

### Managing Tools

```javascript
// Check if tool exists
if (agent.toolManager.hasTool('calculate')) {
    console.log('Tool exists!');
}

// Get all tools
const tools = agent.toolManager.getAllTools();
console.log('Available tools:', tools.map(t => t.name));

// Get tool count
const count = agent.toolManager.getToolCount();

// Remove a tool
agent.toolManager.removeTool('old_tool');

// Clear all tools
agent.toolManager.clearTools();
```

## 💬 Chat History Management

### Automatic History Tracking

```javascript
const agent = new Agentify({
    provider: 'openai',
    apiKey: 'your-api-key',
    model: 'gpt-4',
    useHistory: true,              // Save to localStorage (default: true)
    includeHistory: true,          // Send to model (default: true)
    maxHistoryMessages: 50         // Context window size (default: 50)
});

// First message
await agent.chat('My name is Alice', { chatId: 'chat_123' });

// ...many messages later...

// AI still remembers!
await agent.chat('What is my name?', { chatId: 'chat_123' });
// Response: "Your name is Alice"
```

### Working with Conversations

```javascript
// Start new conversation
const chatId = await agent.startNewChat('Hello! I need help with...');

// Continue existing conversation
await agent.continueChat('chat_123', 'Tell me more');

// Get conversation history
const history = agent.getChatHistory('chat_123');
console.log('Messages:', history.messages);
console.log('Message count:', history.metadata.messageCount);
console.log('Created:', history.metadata.createdAt);
console.log('Last update:', history.metadata.lastModified);

// Get specific messages
const lastTen = agent.getLastChatMessages('chat_123', 10);
const userMessages = agent.getChatMessages('chat_123', {
    role: 'user',
    limit: 20,
    offset: 0
});

// Search in conversation
const results = agent.searchChatMessages('chat_123', 'keyword', {
    role: 'assistant',
    limit: 10
});
```

### Chat Management

```javascript
// Get all chat IDs
const allChats = agent.getAllHistoryChatIds();

// Check if chat exists
if (agent.chatHistoryExists('chat_123')) {
    console.log('Chat found!');
}

// Get message count
const count = agent.getChatMessageCount('chat_123');

// Generate new chat ID
const newChatId = agent.generateNewChatId();
// Returns: "chat_1234567890_abc123"

// Set current chat ID (for subsequent messages)
agent.setChatId('my-custom-chat-id');

// Or use any custom string
agent.setChatId('user_123_session_456');
agent.setChatId('support-ticket-789');

// Get current chat ID
const current = agent.getCurrentChatId();

// Update entire chat history (replace all messages)
agent.updateChatHistory('chat_123', [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' }
]);
```

### Import/Export

```javascript
// Export chat in various formats
const json = agent.exportChatHistory('chat_123', 'json');
const text = agent.exportChatHistory('chat_123', 'text');
const markdown = agent.exportChatHistory('chat_123', 'markdown');
const html = agent.exportChatHistory('chat_123', 'html');

// Download as file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'chat-history.json';
a.click();

// Import chat history
agent.importChatHistory('chat_123', json, 'json');

// Merge multiple chats
agent.mergeChats('target_chat', ['source1', 'source2']);
```

### Storage Management

```javascript
// Get statistics
const stats = agent.getChatHistoryStats();
console.log('Total chats:', stats.totalChats);
console.log('Total messages:', stats.totalMessages);
console.log('Storage used:', stats.storageUsedFormatted);
console.log('Oldest chat:', stats.oldestChatDate);
console.log('Newest chat:', stats.newestChatDate);

// Clear specific chat
agent.clearChatHistory('chat_123');

// Clear all chats
agent.clearAllChatHistories();

// Get context window (formatted for API)
const context = agent.getContextWindow('chat_123', 30);
```

## 🗄️ Complete Storage & Configuration Management

### Get Storage Information

```javascript
// Get complete storage usage
const storageInfo = agent.getStorageInfo();

console.log('Tasks:', storageInfo.tasks.count, '-', storageInfo.tasks.sizeFormatted);
console.log('Events:', storageInfo.events.count, '-', storageInfo.events.sizeFormatted);
console.log('Chat Histories:', storageInfo.chatHistories.count, 'chats,', 
            storageInfo.chatHistories.messages, 'messages -', 
            storageInfo.chatHistories.sizeFormatted);
console.log('Total Storage:', storageInfo.total.sizeFormatted);

// Example output:
// Tasks: 45 - 128 KB
// Events: 523 - 256 KB
// Chat Histories: 12 chats, 347 messages - 512 KB
// Total Storage: 896 KB
```

### Clear All Storage

```javascript
// Clear everything (tasks, events, chat histories, current history, error log)
// ⚠️ WARNING: This deletes all data!
agent.clearAllStorage();

// Or clear individually
agent.clearTasks();           // Clear task history
agent.clearEvents();          // Clear event log
agent.clearAllChatHistories(); // Clear all conversations
agent.clearHistory();         // Clear current session history
agent.clearErrorLog();        // Clear error log
```

### Configuration Management

```javascript
// Reset configuration to defaults
// (keeps API key and provider for security)
agent.resetConfiguration();
// Resets: temperature → 0.7, maxTokens → null, stream → true

// Clear sensitive data (API key, custom headers)
agent.clearSensitiveData();
// Sets: apiKey → null, customHeaders → {}

// Full reset (everything except storage)
agent.resetConfiguration();
agent.clearSensitiveData();

// Then reconfigure
agent
    .setApiKey('new-key')
    .setModel('gpt-4')
    .setTemperature(0.8);
```

### Storage Cleanup Strategy

```javascript
// Strategy 1: Regular automated cleanup
setInterval(() => {
    const info = agent.getStorageInfo();
    
    // If total storage > 2MB
    if (info.total.sizeBytes > 2 * 1024 * 1024) {
        // Export important data
        const tasks = agent.exportTasks('json');
        const events = agent.exportEvents('json');
        sendToBackend({ tasks, events });
        
        // Clear old data
        agent.clearTasks();
        agent.deleteOldEvents(sevenDaysAgo);
    }
}, 24 * 60 * 60 * 1000);  // Daily

// Strategy 2: Manual cleanup with user confirmation
function cleanupStorage() {
    const info = agent.getStorageInfo();
    
    if (confirm(`Clear ${info.total.sizeFormatted} of storage data?`)) {
        agent.clearAllStorage();
        alert('Storage cleared!');
    }
}

// Strategy 3: Selective cleanup
function smartCleanup() {
    const chatStats = agent.getChatHistoryStats();
    const allChats = agent.getAllHistoryChatIds();
    
    // Keep only last 5 chats
    if (allChats.length > 5) {
        const oldChats = allChats.slice(0, -5);
        oldChats.forEach(chatId => {
            agent.clearChatHistory(chatId);
        });
    }
    
    // Clear old events (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    agent.deleteOldEvents(thirtyDaysAgo.toISOString());
    
    // Clear completed tasks
    const tasks = agent.getTasks({ status: 'completed' });
    // Export first
    const data = agent.exportTasks('json');
    sendToBackend(data);
    agent.clearTasks();
}
```

### Update Chat History Manually

```javascript
// Scenario 1: Prepopulate conversation
agent.updateChatHistory('onboarding_chat', [
    { role: 'assistant', content: 'Welcome! I\'m your AI assistant.' },
    { role: 'user', content: 'Thanks! I need help with...' },
    { role: 'assistant', content: 'I\'d be happy to help!' }
]);

// Scenario 2: Import from backend
const savedConversation = await fetchFromBackend('chat_123');
agent.updateChatHistory('chat_123', savedConversation.messages);

// Scenario 3: Manually construct conversation
const manualHistory = [
    { 
        role: 'system', 
        content: 'You are a helpful assistant specializing in...' 
    },
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi! How can I help?' }
];
agent.updateChatHistory('custom_chat', manualHistory);

// Then continue the conversation
await agent.continueChat('custom_chat', 'Tell me more');
```

### Configuration Reset Examples

```javascript
// Example 1: Switch between projects
function switchProject(projectConfig) {
    // Clear current config
    agent.clearSensitiveData();
    agent.resetConfiguration();
    
    // Load new config
    agent.configure(projectConfig);
}

// Example 2: Logout user
function logoutUser() {
    // Export user data first
    const chatIds = agent.getAllHistoryChatIds();
    const userData = chatIds.map(id => ({
        chatId: id,
        data: agent.exportChatHistory(id, 'json')
    }));
    
    sendToBackend(userData);
    
    // Clear everything
    agent.clearAllStorage();
    agent.clearSensitiveData();
}

// Example 3: Security - clear after inactivity
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        // User inactive for 30 minutes
        agent.clearSensitiveData();
        alert('Session expired for security. Please re-enter API key.');
    }, 30 * 60 * 1000);
}

// Example 4: Testing - reset between tests
beforeEach(() => {
    agent.clearAllStorage();
    agent.resetConfiguration();
    agent.setApiKey(TEST_API_KEY);
});
```

## 📊 Event Logging System

### Automatic Event Tracking

Every interaction is automatically logged with complete details:

```javascript
// Get all events
const events = agent.getEvents();

// Filter by type
const userMessages = agent.getEventsByType('user_message_sent');
const toolCalls = agent.getEventsByType('tool_call_completed');
const errors = agent.getEventsByType('error_occurred');

// Filter by chat ID
const chatEvents = agent.getEventsByChatId('chat_123');

// Advanced filtering
const recent = agent.getEvents({
    type: 'assistant_message_completed',
    chatId: 'chat_123',
    since: '2024-01-01',
    limit: 50
});

// Get chat timeline (chronological events for a chat)
const timeline = agent.getChatTimeline('chat_123');
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `user_message_sent` | User sends a message |
| `assistant_message_started` | Assistant starts responding |
| `assistant_message_completed` | Assistant completes response |
| `assistant_token_received` | Token received (streaming) |
| `tool_call_initiated` | Tool execution starts |
| `tool_call_completed` | Tool execution succeeds |
| `tool_call_failed` | Tool execution fails |
| `thinking_started` | Thinking mode starts |
| `api_request_sent` | API request sent |
| `api_response_received` | API response received |
| `api_request_failed` | API request fails |
| `error_occurred` | Error occurs |
| `stream_started` | Streaming starts |

### Event Structure

```javascript
{
    id: 'evt_1234567890_abc123',
    type: 'tool_call_completed',
    chatId: 'chat_1234567890_xyz789',
    timestamp: '2024-01-15T10:30:00.000Z',
    date: '1402/10/25',           // Persian date
    time: '10:30:00',
    unixTimestamp: 1705315800000,
    data: {
        toolName: 'calculate',
        parameters: { expression: '2+2' },
        result: { result: 4 },
        duration: 15,
        metadata: { chatId: 'chat_123' }
    }
}
```

### Event Management

```javascript
// Get statistics
const stats = agent.getEventStats();
console.log('Total events:', stats.totalEvents);
console.log('Storage used:', stats.storageUsedFormatted);
console.log('Unique chats:', stats.uniqueChatIds);
console.log('Events by type:', stats.eventsByType);

// Export events
const jsonData = agent.exportEvents('json');
const csvData = agent.exportEvents('csv');
const htmlTable = agent.exportEvents('table');

// Send to backend
await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonData
});

// Clear events
agent.clearEvents();

// Delete specific chat events
agent.deleteEventsByChatId('chat_123');

// Delete old events
agent.deleteOldEvents('2024-01-01');
```

## 🎭 Thinking Status Tracking

Track what the AI is doing in real-time:

```javascript
// Subscribe to thinking status changes
const unsubscribe = agent.onThinkingChange((status) => {
    console.log('Thinking:', status.isThinking);
    console.log('Action:', status.currentAction);
    console.log('Progress:', status.progress);
    console.log('Step:', status.step);
    console.log('Elapsed:', status.elapsedTime, 'ms');
    
    if (status.isThinking) {
        document.getElementById('status').textContent = status.currentAction;
        document.getElementById('spinner').style.display = 'block';
    } else {
        document.getElementById('spinner').style.display = 'none';
    }
});

// Get current status
const status = agent.getThinkingStatus();

// Unsubscribe when done
unsubscribe();
```

### Example: Progress Indicator

```javascript
agent.onThinkingChange((status) => {
    const indicator = document.getElementById('thinking-indicator');
    
    if (status.isThinking) {
        indicator.innerHTML = `
            <div class="spinner"></div>
            <div>${status.currentAction}</div>
            <div>${Math.round(status.elapsedTime / 1000)}s</div>
        `;
    } else {
        indicator.innerHTML = '';
    }
});
```

## 💾 Task Management

Automatic task tracking for all operations:

```javascript
// Get all tasks
const tasks = agent.getTasks();

// Filter tasks
const failedTasks = agent.getTasks({
    status: 'failed',
    since: '2024-01-01',
    limit: 20
});

const recentTasks = agent.getTasks({
    chatId: 'chat_123',
    limit: 10
});

// Get task statistics
const stats = agent.getTaskStats();
console.log('Total tasks:', stats.totalTasks);
console.log('By status:', stats.byStatus);
console.log('By type:', stats.byType);
console.log('Storage used:', stats.storageUsedFormatted);
console.log('Average duration:', stats.averageDuration, 'ms');

// Export tasks for backend integration
const json = agent.exportTasks('json');
const csv = agent.exportTasks('csv');
const text = agent.exportTasks('text');

// Send to backend
await fetch('/api/tasks/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
});

// Clear tasks after sync
agent.clearTasks();
```

## 🛡️ Error Handling

### Graceful Error Recovery

Agentify never stops on errors - it reports them to the AI for recovery:

```javascript
await agent.chat('Calculate xyz', {
    onError: (error) => {
        console.log('Error occurred:', error.message);
        // But conversation continues!
    }
});

// AI receives error context:
// "I encountered an error: Invalid expression. 
//  Would you like to try rephrasing your request?"
```

### Error Types & Codes

#### SystemError
Configuration, initialization, validation issues

```javascript
import { SystemError } from './agentify/index.js';

try {
    await agent.chat('');  // Empty message
} catch (error) {
    if (error instanceof SystemError) {
        console.log('Code:', error.code);
        // SYS_VALIDATION_FAILED, SYS_CONFIG_MISSING, etc.
    }
}
```

**Codes:**
- `SYS_CONFIG_INVALID` - Invalid configuration
- `SYS_CONFIG_MISSING` - Missing required config
- `SYS_VALIDATION_FAILED` - Validation failure
- `SYS_INVALID_PARAMETER` - Invalid parameter
- `MAX_TOOL_ROUNDS_EXCEEDED` - Too many tool calls

#### NetworkError
API communication problems

```javascript
import { NetworkError } from './agentify/index.js';

// Codes:
// NET_CONNECTION_FAILED, NET_TIMEOUT, NET_RATE_LIMIT,
// NET_UNAUTHORIZED, NET_SERVER_ERROR, NET_INVALID_RESPONSE
```

**Smart Recovery:**
- `401` → "Authentication failed. Please check your API key."
- `429` → "Rate limit exceeded. Please wait a moment."
- `500` → "Service experiencing issues. Try again in a moment."

#### ModelError
AI model response issues

```javascript
import { ModelError } from './agentify/index.js';

// Codes:
// MDL_INVALID_RESPONSE, MDL_RESPONSE_PARSE_FAILED,
// MDL_CONTEXT_LENGTH_EXCEEDED
```

#### ToolError
Tool execution failures

```javascript
import { ToolError } from './agentify/index.js';

// Codes:
// TOOL_NOT_FOUND, TOOL_EXEC_FAILED,
// TOOL_INVALID_PARAMS, TOOL_REGISTRATION_FAILED
```

**Recovery Behavior:**
- Tool not found → AI sees available tools, picks correct one
- Invalid params → AI sees error, reformats request
- Execution fails → AI tries alternative approach

#### StreamError
Streaming/parsing problems

```javascript
import { StreamError } from './agentify/index.js';

// Codes:
// STR_PARSE_FAILED, STR_CONNECTION_LOST, STR_INVALID_FORMAT
```

#### StorageError
localStorage issues

```javascript
import { StorageError } from './agentify/index.js';

// Codes:
// STG_QUOTA_EXCEEDED, STG_NOT_AVAILABLE, STG_WRITE_FAILED
```

### Error Formatting

```javascript
try {
    await agent.chat('Hello');
} catch (error) {
    // Console output (with colors)
    console.error(error.toConsole());
    
    // HTML output (styled)
    document.getElementById('errors').innerHTML = error.toHTML();
    
    // JSON for backend
    const errorData = error.toJSON();
    await fetch('/api/errors/log', {
        method: 'POST',
        body: JSON.stringify(errorData)
    });
    
    // Error properties
    console.log('Message:', error.message);
    console.log('Code:', error.code);
    console.log('Category:', error.category);
    console.log('Timestamp:', error.timestamp);
    console.log('Details:', error.details);
}
```

### Error Callbacks

```javascript
await agent.chat('Hello', {
    onError: (error) => {
        // Notification
        showNotification(error.message, 'error');
        
        // Log to service
        logErrorToService(error.toJSON());
        
        // Update UI
        updateErrorDisplay(error.toHTML());
    }
});
```

### Error Log

```javascript
// Get error history
const errorLog = agent.getErrorLog();
console.log('Recent errors:', errorLog);

// Clear error log
agent.clearErrorLog();
```

## 🌐 Provider Support

### OpenAI

```javascript
const agent = new Agentify({
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-...',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
});
```

**Supported Models:**
- `gpt-4`, `gpt-4-turbo`, `gpt-4-32k`
- `gpt-3.5-turbo`, `gpt-3.5-turbo-16k`

### Anthropic Claude

```javascript
const agent = new Agentify({
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    apiKey: 'sk-ant-...',
    model: 'claude-3-opus-20240229',
    maxTokens: 4096
});
```

**Supported Models:**
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Google Gemini

```javascript
const agent = new Agentify({
    provider: 'gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    apiKey: 'your-api-key',
    model: 'gemini-pro'
});
```

**Supported Models:**
- `gemini-pro`
- `gemini-pro-vision`

### DeepSeek

```javascript
const agent = new Agentify({
    provider: 'deepseek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'deepseek-chat',
    temperature: 0.7
});
```

**Supported Models:**
- `deepseek-chat`
- `deepseek-coder`

### Custom API

```javascript
const agent = new Agentify({
    provider: 'custom',
    apiUrl: 'https://your-api.com/v1/chat',
    apiKey: 'your-key',
    model: 'your-model',
    customHeaders: {
        'X-Custom-Header': 'value'
    }
});
```

## 🎨 Complete Example

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>Agentify Chat</title>
    <style>
        .chat-container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .message { padding: 10px; margin: 10px 0; border-radius: 8px; }
        .user { background: #007bff; color: white; text-align: right; }
        .assistant { background: #f1f1f1; }
        .error { background: #ffebee; color: #c62828; }
        .thinking { color: #666; font-style: italic; }
        .tools { background: #e3f2fd; padding: 10px; margin: 10px 0; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    </style>
</head>
<body>
    <div class="chat-container">
        <h1>🤖 Agentify Chat</h1>
        
        <div id="thinking" class="thinking"></div>
        
        <div id="chat"></div>
        
        <div id="tools" class="tools"></div>
        
        <div class="stats">
            <div>Messages: <span id="msg-count">0</span></div>
            <div>Tools: <span id="tool-count">0</span></div>
            <div>Events: <span id="event-count">0</span></div>
        </div>
        
        <input type="text" id="input" placeholder="Type a message..." />
        <button onclick="sendMessage()">Send</button>
        <button onclick="clearChat()">Clear</button>
    </div>
    
    <script type="module" src="app.js"></script>
</body>
</html>
```

### JavaScript Implementation

```javascript
// app.js
import { Agentify } from './agentify/index.js';

// Initialize agent
const agent = new Agentify({
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-4',
    stream: true,
    temperature: 0.7,
    useHistory: true,
    maxHistoryMessages: 50
});

// Set instruction
agent.setInstruction('You are a helpful AI assistant with access to tools.');

// Add tools
await agent.addTools([
    {
        name: 'calculate',
        description: 'Perform mathematical calculations',
        instruction: 'Use when user asks for math operations',
        parameters: {
            expression: { type: 'string', required: true }
        },
        execute: async (params) => {
            try {
                const result = eval(params.expression);
                return { result, expression: params.expression };
            } catch (error) {
                return { error: 'Invalid expression' };
            }
        }
    },
    {
        name: 'get_time',
        description: 'Get current date and time',
        instruction: 'Use when user asks about current time',
        parameters: {},
        execute: async () => {
            return {
                time: new Date().toLocaleTimeString(),
                date: new Date().toLocaleDateString()
            };
        }
    }
]);

// Track thinking status
agent.onThinkingChange((status) => {
    const thinkingDiv = document.getElementById('thinking');
    if (status.isThinking) {
        thinkingDiv.textContent = `${status.currentAction}... (${Math.round(status.elapsedTime / 1000)}s)`;
    } else {
        thinkingDiv.textContent = '';
    }
});

// Generate chat ID
const chatId = agent.generateNewChatId();

// Send message
window.sendMessage = async function() {
    const input = document.getElementById('input');
    const message = input.value.trim();
    if (!message) return;
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    input.value = '';
    
    // Send to AI
    const assistantDiv = addMessageToUI('', 'assistant');
    let response = '';
    
    try {
        await agent.chat(message, {
            chatId: chatId,
            
            onToken: (token) => {
                response += token;
                assistantDiv.textContent = response;
            },
            
            onToolCall: (toolCall) => {
                document.getElementById('tools').textContent = 
                    `🔧 Using: ${toolCall.name}`;
            },
            
            onComplete: (result) => {
                updateStats();
                document.getElementById('tools').textContent = '';
            },
            
            onError: (error) => {
                console.error('Error:', error);
                // Error is already handled gracefully by agent
            }
        });
    } catch (error) {
        // Critical errors only
        addMessageToUI(`Critical error: ${error.message}`, 'error');
    }
};

// UI helpers
function addMessageToUI(text, role) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    document.getElementById('chat').appendChild(div);
    return div;
}

function updateStats() {
    const history = agent.getChatHistory(chatId);
    const events = agent.getEventsByChatId(chatId);
    const tools = agent.toolManager.getAllTools();
    
    document.getElementById('msg-count').textContent = 
        history?.metadata?.messageCount || 0;
    document.getElementById('tool-count').textContent = tools.length;
    document.getElementById('event-count').textContent = events.length;
}

window.clearChat = function() {
    agent.clearChatHistory(chatId);
    document.getElementById('chat').innerHTML = '';
    updateStats();
};

// Initial stats
updateStats();
```

## 📁 Project Structure

```
agentify/
├── index.js                       # Main export
├── core/
│   ├── Agentify.js               # Main orchestration class
│   └── ConfigManager.js          # Configuration management
├── tools/
│   └── ToolManager.js            # Tool registration & execution
├── instructions/
│   └── InstructionManager.js     # System instruction management
├── storage/
│   ├── TaskManager.js            # Task persistence
│   └── ChatHistoryManager.js    # Conversation history storage
├── streaming/
│   └── StreamHandler.js          # Stream parsing & handling
├── thinking/
│   └── ThinkingTracker.js        # Status tracking
├── events/
│   └── EventManager.js           # Event logging system
├── errors/
│   ├── ErrorManager.js           # Error creation & handling
│   └── ErrorTypes.js             # Error classes
├── providers/
│   ├── BaseAdapter.js            # Base adapter class
│   ├── OpenAIAdapter.js          # OpenAI format
│   ├── AnthropicAdapter.js       # Anthropic format
│   ├── GeminiAdapter.js          # Google Gemini format
│   └── CustomAdapter.js          # Custom API format
└── utils/
    ├── validators.js             # Input validation
    └── formatters.js             # Data formatting

examples/
├── basic-usage.html              # Simple chat
├── with-tools.html               # Tool usage
├── streaming.html                # Streaming demo
├── error-handling.html           # Error handling
├── event-logging.html            # Event tracking (فارسی)
├── chat-history.html             # History management (فارسی)
└── deepseek-complete.html        # Complete DeepSeek example
```

## 📱 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Full | Recommended |
| Firefox | ✅ Full | All features work |
| Safari | ✅ Full | iOS 14.5+ |
| Opera | ✅ Full | Chromium-based |

**Requirements:**
- ES6 Modules support
- Fetch API
- localStorage (5-10MB available)
- ReadableStream (for streaming)
- Async/await

## 🎯 Best Practices

### 1. Always Use Chat IDs

```javascript
// ✅ Good - separate conversations
const chatId1 = agent.generateNewChatId();
const chatId2 = agent.generateNewChatId();

await agent.chat('Hello', { chatId: chatId1 });
await agent.chat('Hi', { chatId: chatId2 });

// ❌ Bad - mixed conversations
await agent.chat('Hello');
await agent.chat('Hi');
```

### 2. Implement Thinking Status

```javascript
// ✅ Good - user sees progress
agent.onThinkingChange((status) => {
    if (status.isThinking) {
        showLoader(status.currentAction);
    } else {
        hideLoader();
    }
});

// ❌ Bad - no feedback during processing
await agent.chat(message);
```

### 3. Handle Streaming

```javascript
// ✅ Good - real-time updates
await agent.chat(message, {
    stream: true,
    onToken: (token) => updateUI(token)
});

// ❌ Bad - no streaming
const response = await agent.chat(message, { stream: false });
// User waits for entire response
```

### 4. Provide Clear Tool Instructions

```javascript
// ✅ Good - clear when to use
{
    name: 'search',
    description: 'Search the web for information',
    instruction: 'Use this tool when user asks questions requiring current information, facts, or real-time data that you don\'t know',
    // ...
}

// ❌ Bad - vague
{
    name: 'search',
    description: 'Searches stuff',
    instruction: 'Use sometimes',
    // ...
}
```

### 5. Export Data Regularly

```javascript
// ✅ Good - prevent storage issues
setInterval(() => {
    const tasks = agent.exportTasks('json');
    const events = agent.exportEvents('json');
    
    sendToBackend({ tasks, events });
    
    agent.clearTasks();
    agent.deleteOldEvents(sevenDaysAgo);
}, 24 * 60 * 60 * 1000);  // Daily
```

### 6. Tool Error Handling

```javascript
// ✅ Good - return error, don't throw
execute: async (params) => {
    try {
        const result = await doSomething(params);
        return { success: true, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ❌ Bad - throwing stops execution
execute: async (params) => {
    const result = await doSomething(params);  // throws
    return result;
}
```

### 7. Limit Context Window

```javascript
// ✅ Good - balanced context
const agent = new Agentify({
    maxHistoryMessages: 30  // Last 30 messages
});

// ❌ Bad - too many messages
const agent = new Agentify({
    maxHistoryMessages: 1000  // Context overflow!
});
```

## 🐛 Troubleshooting

### CORS Errors

```javascript
// Problem: CORS policy blocks requests

// Solution 1: Use proxy
apiUrl: 'https://your-proxy.com/api/openai'

// Solution 2: Run local server
// python -m http.server 8080
// Then access via http://localhost:8080
```

### Storage Quota Exceeded

```javascript
// Problem: localStorage full

// Solution: Regular cleanup
const stats = agent.getChatHistoryStats();
if (stats.storageUsed > 4 * 1024 * 1024) {  // 4MB
    // Export important chats
    const important = agent.exportChatHistory('important_chat', 'json');
    saveToBackend(important);
    
    // Clear old data
    agent.clearAllChatHistories();
    agent.clearEvents();
    agent.clearTasks();
}
```

### Tools Not Working

```javascript
// Problem: Tool not executing

// Debug steps:
console.log('Has tool?', agent.toolManager.hasTool('my_tool'));
console.log('All tools:', agent.toolManager.getAllTools());
console.log('Error log:', agent.getErrorLog());

// Check events
const toolEvents = agent.getEventsByType('tool_call_failed');
console.log('Failed calls:', toolEvents);
```

### Streaming Not Working

```javascript
// Problem: No streaming output

// Check 1: Browser support
if (!window.ReadableStream) {
    console.error('Browser doesn\'t support streaming');
    agent.configure({ stream: false });
}

// Check 2: API supports streaming
// Some providers don't support SSE

// Check 3: Network issues
await agent.chat(message, {
    onError: (error) => {
        if (error.code === 'STR_CONNECTION_LOST') {
            console.error('Streaming connection lost');
        }
    }
});
```

### Model Context Overflow

```javascript
// Problem: Context length exceeded

// Solution: Reduce history
agent.setMaxHistoryMessages(20);  // Reduce from default 50

// Or start new conversation
const newChatId = agent.generateNewChatId();
```

## 🔒 Security Considerations

### 1. API Key Protection

```javascript
// ❌ Never commit API keys
const apiKey = 'sk-your-key-here';

// ✅ Use environment or prompt user
const apiKey = prompt('Enter your API key:');
localStorage.setItem('apiKey', apiKey);
```

### 2. Tool Execution Safety

```javascript
// ❌ Dangerous - arbitrary code execution
execute: async (params) => {
    return eval(params.code);  // DON'T DO THIS
}

// ✅ Safe - validated execution
execute: async (params) => {
    // Whitelist allowed operations
    const allowed = ['+', '-', '*', '/'];
    if (!allowed.some(op => params.expression.includes(op))) {
        return { error: 'Invalid operation' };
    }
    // Safe evaluation
}
```

### 3. XSS Prevention

```javascript
// ❌ Dangerous - XSS vulnerability
messageDiv.innerHTML = userMessage;

// ✅ Safe - escaped text
messageDiv.textContent = userMessage;

// Or use library
messageDiv.innerHTML = DOMPurify.sanitize(userMessage);
```

### 4. localStorage Security

```javascript
// Note: localStorage is NOT encrypted
// Don't store sensitive data
// ❌ Bad
localStorage.setItem('password', userPassword);

// ✅ Good - only non-sensitive data
localStorage.setItem('chatId', chatId);
```

## 📊 Performance Tips

### 1. Batch Tool Calls

```javascript
// Let AI call multiple tools in one round
// instead of requiring manual intervention
agent.chat('Calculate 2+2, then 5*3, then 10-4', {
    maxToolRounds: 10  // Allow chaining
});
```

### 2. Limit Event Logging

```javascript
// Disable token events if not needed (reduces storage)
// They're already disabled by default in StreamHandler
// Only user messages, tool calls, and errors are logged
```

### 3. Context Window Management

```javascript
// Use smaller context for faster responses
agent.setMaxHistoryMessages(10);  // Instead of 50

// Or use dynamic sizing
const messageCount = agent.getChatMessageCount(chatId);
if (messageCount > 100) {
    agent.setMaxHistoryMessages(30);  // Reduce for long chats
}
```

### 4. Lazy Tool Registration

```javascript
// Register tools only when needed
document.getElementById('enableCalculator').onclick = async () => {
    await agent.addTool(calculatorTool);
};
```

## 📚 Advanced Usage

### Custom Adapter

```javascript
import { BaseAdapter } from './agentify/providers/BaseAdapter.js';

class MyCustomAdapter extends BaseAdapter {
    formatRequest(messages, tools, config) {
        // Format for your API
        return {
            prompt: messages.map(m => m.content).join('\n'),
            model: config.model,
            tools: tools.map(t => ({
                name: t.function.name,
                desc: t.function.description
            }))
        };
    }
    
    parseResponse(data) {
        // Parse your API response
        return {
            content: data.output || '',
            toolCalls: data.tool_calls || [],
            finishReason: data.done ? 'stop' : 'length'
        };
    }
    
    formatTools(tools) {
        // Format tools for your API
        return tools;
    }
}

// Use custom adapter
const agent = new Agentify({
    provider: 'custom',
    apiUrl: 'https://your-api.com/chat',
    apiKey: 'your-key',
    adapter: new MyCustomAdapter()
});
```

### Direct Manager Access

```javascript
// Access internal managers for advanced control

// Config Manager
agent.configManager.get('model');
agent.configManager.set('temperature', 0.9);
agent.configManager.validateRequired();

// Tool Manager
agent.toolManager.hasTool('my_tool');
agent.toolManager.getAllTools();
agent.toolManager.removeTool('old_tool');

// Task Manager
agent.taskManager.getTasks();
agent.taskManager.updateTaskStatus(taskId, 'completed');

// Event Manager
agent.eventManager.logEvent('custom_event', { data: 'value' });

// Error Manager
agent.errorManager.createSystemError('message', 'CODE');
```

### Agent Status

```javascript
const status = agent.getStatus();

console.log('Configuration:', status.config);
console.log('Message count:', status.messageCount);
console.log('Tool count:', status.toolCount);
console.log('Has instruction:', status.hasInstruction);
console.log('Task statistics:', status.taskStats);
console.log('Thinking status:', status.thinkingStatus);
console.log('Error count:', status.errorCount);
console.log('Event count:', status.eventCount);
```

## 📖 Examples

The `examples/` directory contains complete working demos:

| File | Description |
|------|-------------|
| `basic-usage.html` | Simple chat with streaming |
| `with-tools.html` | Custom tool usage |
| `streaming.html` | Real-time streaming demo |
| `error-handling.html` | Comprehensive error handling |
| `event-logging.html` | Event tracking (فارسی UI) |
| `chat-history.html` | History management (فارسی UI) |
| `deepseek-complete.html` | Complete DeepSeek example with all features |

**To run examples:**

1. Start local server:
   ```bash
   python -m http.server 8080
   ```

2. Open in browser:
   ```
   http://localhost:8080/examples/basic-usage.html
   ```

3. Enter your API key and start chatting!

## 📚 Quick API Reference

### Core Methods

| Category | Method | Description |
|----------|--------|-------------|
| **Chat** | `chat(message, options)` | Send message to AI |
| | `startNewChat(message)` | Start new conversation |
| | `continueChat(chatId, message)` | Continue existing chat |
| **Config** | `setModel(model)` | Set AI model |
| | `setApiKey(key)` | Set API key |
| | `setApiUrl(url)` | Set API endpoint |
| | `setProvider(provider)` | Set provider |
| | `setTemperature(temp)` | Set temperature |
| | `configure(config)` | Batch configuration |
| | `resetConfiguration()` | Reset to defaults |
| | `clearSensitiveData()` | Clear API key/headers |
| **Tools** | `addTool(tool)` | Register single tool |
| | `addTools(tools)` | Register multiple tools |
| | `toolManager.hasTool(name)` | Check if tool exists |
| | `toolManager.getAllTools()` | Get all tools |
| | `toolManager.removeTool(name)` | Remove tool |
| **History** | `getChatHistory(chatId)` | Get chat messages |
| | `getLastChatMessages(chatId, n)` | Get last N messages |
| | `updateChatHistory(chatId, msgs)` | Replace chat history |
| | `clearChatHistory(chatId)` | Clear specific chat |
| | `clearAllChatHistories()` | Clear all chats |
| | `exportChatHistory(id, format)` | Export chat (json/text/md/html) |
| | `importChatHistory(id, data, fmt)` | Import chat |
| | `searchChatMessages(id, query)` | Search in chat |
| | `getAllHistoryChatIds()` | Get all chat IDs |
| | `getChatHistoryStats()` | Get history statistics |
| **Chat ID** | `generateNewChatId()` | Create unique chat ID |
| | `setChatId(chatId)` | Set current chat ID |
| | `getCurrentChatId()` | Get current chat ID |
| **Events** | `getEvents(options)` | Get all events |
| | `getEventsByType(type)` | Filter by type |
| | `getEventsByChatId(chatId)` | Filter by chat |
| | `getChatTimeline(chatId)` | Get chat timeline |
| | `getEventStats()` | Get statistics |
| | `exportEvents(format)` | Export (json/csv/table) |
| | `clearEvents()` | Clear all events |
| | `deleteEventsByChatId(chatId)` | Delete chat events |
| | `deleteOldEvents(date)` | Delete before date |
| **Tasks** | `getTasks(options)` | Get task list |
| | `getTaskStats()` | Get statistics |
| | `exportTasks(format)` | Export (json/csv/text) |
| | `clearTasks()` | Clear all tasks |
| **Storage** | `getStorageInfo()` | Get usage details |
| | `clearAllStorage()` | **Clear everything!** |
| **Thinking** | `onThinkingChange(callback)` | Subscribe to status |
| | `getThinkingStatus()` | Get current status |
| **Instruction** | `setInstruction(text)` | Set system instruction |
| | `loadInstructionFromFile(file)` | Load from file |
| | `getInstruction()` | Get instruction |
| **Other** | `getHistory()` | Get current session history |
| | `clearHistory()` | Clear session history |
| | `getStatus()` | Get agent status |
| | `getErrorLog()` | Get error history |
| | `clearErrorLog()` | Clear errors |

### Chat Options

```javascript
await agent.chat(message, {
    chatId: 'chat_123',           // Conversation ID
    stream: true,                 // Enable streaming
    maxToolRounds: 10,            // Max tool call iterations
    
    // Callbacks
    onToken: (token) => {},       // Each token received
    onToolCall: (call) => {},     // Tool being executed
    onThinking: (thought) => {},  // Thinking content
    onComplete: (result) => {},   // Response complete
    onError: (error) => {}        // Error occurred
});
```

### Event Types

- `user_message_sent` - User message
- `assistant_message_started` - AI starts responding
- `assistant_message_completed` - AI finishes
- `tool_call_initiated` - Tool starts
- `tool_call_completed` - Tool succeeds
- `tool_call_failed` - Tool fails
- `api_request_sent` - API call sent
- `api_response_received` - API responds
- `error_occurred` - Error happens
- `thinking_started` - Thinking begins
- `stream_started` - Stream starts

### Error Codes

| Category | Codes |
|----------|-------|
| **System** | `SYS_CONFIG_INVALID`, `SYS_CONFIG_MISSING`, `SYS_VALIDATION_FAILED`, `MAX_TOOL_ROUNDS_EXCEEDED` |
| **Network** | `NET_CONNECTION_FAILED`, `NET_TIMEOUT`, `NET_RATE_LIMIT`, `NET_UNAUTHORIZED`, `NET_SERVER_ERROR` |
| **Model** | `MDL_INVALID_RESPONSE`, `MDL_RESPONSE_PARSE_FAILED`, `MDL_CONTEXT_LENGTH_EXCEEDED` |
| **Tool** | `TOOL_NOT_FOUND`, `TOOL_EXEC_FAILED`, `TOOL_INVALID_PARAMS` |
| **Stream** | `STR_PARSE_FAILED`, `STR_CONNECTION_LOST`, `STR_INVALID_FORMAT` |
| **Storage** | `STG_QUOTA_EXCEEDED`, `STG_NOT_AVAILABLE`, `STG_WRITE_FAILED` |

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests and examples
5. Update documentation
6. Submit a pull request

### Code Style

- Use ES6+ features
- Follow existing code structure
- Add JSDoc comments
- Keep functions focused and small
- Use descriptive variable names

## 📄 License

MIT License - use freely in your projects!

## 🆘 Support

- **Issues**: Open a GitHub issue
- **Questions**: Start a discussion
- **Features**: Submit a feature request

## 🙏 Acknowledgments

Built with:
- Modern JavaScript ES6+
- Fetch API for HTTP requests
- localStorage for persistence
- ReadableStream for streaming

Inspired by the need for a simple, powerful, browser-native AI agent library.

---

**Made with ❤️ for the JavaScript community**

*Agentify.js - Build intelligent AI agents in the browser with confidence.*
