import { StorageError } from '../errors/ErrorTypes.js';
import { formatBytes } from '../utils/formatters.js';

/**
 * Manages chat history storage and retrieval
 */
export class ChatHistoryManager {
  constructor(storageKey = 'agentify_chat_history', errorManager) {
    this.storageKey = storageKey;
    this.errorManager = errorManager;
    this.maxMessagesPerChat = 100;
    this.maxChats = 50;
    
    this.ensureStorageAvailable();
  }

  /**
   * Ensure localStorage is available
   */
  ensureStorageAvailable() {
    try {
      const test = '__agentify_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch (error) {
      throw this.errorManager.createStorageError(
        'localStorage is not available',
        StorageError.codes.NOT_AVAILABLE,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get all chat histories
   */
  getAllHistories() {
    try {
      const historiesJson = localStorage.getItem(this.storageKey);
      if (!historiesJson) {
        return {};
      }
      return JSON.parse(historiesJson);
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to read chat histories',
        StorageError.codes.READ_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Save all chat histories
   */
  saveAllHistories(histories) {
    try {
      const historiesJson = JSON.stringify(histories);
      localStorage.setItem(this.storageKey, historiesJson);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Try to clean up old chats
        this.cleanupOldChats(histories);
        
        try {
          const historiesJson = JSON.stringify(histories);
          localStorage.setItem(this.storageKey, historiesJson);
        } catch {
          throw this.errorManager.createStorageError(
            'Storage quota exceeded even after cleanup',
            StorageError.codes.QUOTA_EXCEEDED,
            { chatCount: Object.keys(histories).length }
          );
        }
      } else {
        throw this.errorManager.createStorageError(
          'Failed to save chat histories',
          StorageError.codes.WRITE_FAILED,
          { originalError: error.message }
        );
      }
    }
  }

  /**
   * Get chat history by ID
   */
  getChatHistory(chatId) {
    const histories = this.getAllHistories();
    
    if (!histories[chatId]) {
      return {
        chatId,
        messages: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0
        }
      };
    }

    return histories[chatId];
  }

  /**
   * Get messages for a chat
   */
  getMessages(chatId, options = {}) {
    const history = this.getChatHistory(chatId);
    let messages = [...history.messages];

    // Apply limit
    if (options.limit && options.limit > 0) {
      messages = messages.slice(-options.limit);
    }

    // Apply offset
    if (options.offset && options.offset > 0) {
      messages = messages.slice(options.offset);
    }

    // Filter by role
    if (options.role) {
      messages = messages.filter(m => m.role === options.role);
    }

    return messages;
  }

  /**
   * Add message to chat history
   */
  addMessage(chatId, message) {
    const histories = this.getAllHistories();
    
    if (!histories[chatId]) {
      histories[chatId] = {
        chatId,
        messages: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 0
        }
      };
    }

    const chat = histories[chatId];
    
    // Add message with metadata
    const messageWithMeta = {
      ...message,
      timestamp: new Date().toISOString(),
      messageId: this.generateMessageId()
    };

    chat.messages.push(messageWithMeta);
    chat.metadata.updatedAt = new Date().toISOString();
    chat.metadata.messageCount = chat.messages.length;

    // Trim if exceeds max
    if (chat.messages.length > this.maxMessagesPerChat) {
      chat.messages = chat.messages.slice(-this.maxMessagesPerChat);
      chat.metadata.messageCount = chat.messages.length;
    }

    this.saveAllHistories(histories);
    
    return messageWithMeta;
  }

  /**
   * Add multiple messages to chat history
   */
  addMessages(chatId, messages) {
    const results = [];
    for (const message of messages) {
      results.push(this.addMessage(chatId, message));
    }
    return results;
  }

  /**
   * Update chat history completely
   */
  updateChatHistory(chatId, messages) {
    const histories = this.getAllHistories();
    
    histories[chatId] = {
      chatId,
      messages: messages.map((msg, index) => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString(),
        messageId: msg.messageId || this.generateMessageId()
      })),
      metadata: {
        createdAt: histories[chatId]?.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: messages.length
      }
    };

    this.saveAllHistories(histories);
    return histories[chatId];
  }

  /**
   * Clear chat history
   */
  clearChatHistory(chatId) {
    const histories = this.getAllHistories();
    
    if (histories[chatId]) {
      delete histories[chatId];
      this.saveAllHistories(histories);
      return true;
    }

    return false;
  }

  /**
   * Clear all chat histories
   */
  clearAllHistories() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to clear chat histories',
        StorageError.codes.WRITE_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Get all chat IDs
   */
  getAllChatIds() {
    const histories = this.getAllHistories();
    return Object.keys(histories);
  }

  /**
   * Get chat metadata
   */
  getChatMetadata(chatId) {
    const history = this.getChatHistory(chatId);
    return history.metadata;
  }

  /**
   * Check if chat exists
   */
  chatExists(chatId) {
    const histories = this.getAllHistories();
    return !!histories[chatId];
  }

  /**
   * Get message count for a chat
   */
  getMessageCount(chatId) {
    const history = this.getChatHistory(chatId);
    return history.messages.length;
  }

  /**
   * Get last N messages from a chat
   */
  getLastMessages(chatId, count = 10) {
    const history = this.getChatHistory(chatId);
    return history.messages.slice(-count);
  }

  /**
   * Search messages in a chat
   */
  searchMessages(chatId, query, options = {}) {
    const history = this.getChatHistory(chatId);
    const queryLower = query.toLowerCase();

    let results = history.messages.filter(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return content.toLowerCase().includes(queryLower);
    });

    if (options.role) {
      results = results.filter(msg => msg.role === options.role);
    }

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Export chat history
   */
  exportChatHistory(chatId, format = 'json') {
    const history = this.getChatHistory(chatId);

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(history, null, 2);
      
      case 'text':
        return this.chatToText(history);
      
      case 'markdown':
        return this.chatToMarkdown(history);
      
      case 'html':
        return this.chatToHTML(history);
      
      default:
        return JSON.stringify(history);
    }
  }

  /**
   * Convert chat to text format
   */
  chatToText(history) {
    let text = `Chat ID: ${history.chatId}\n`;
    text += `Created: ${history.metadata.createdAt}\n`;
    text += `Messages: ${history.metadata.messageCount}\n`;
    text += `${'='.repeat(60)}\n\n`;

    history.messages.forEach((msg, index) => {
      text += `[${index + 1}] ${msg.role.toUpperCase()}\n`;
      text += `Time: ${msg.timestamp}\n`;
      text += `Content: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}\n`;
      text += `${'-'.repeat(60)}\n\n`;
    });

    return text;
  }

  /**
   * Convert chat to markdown format
   */
  chatToMarkdown(history) {
    let md = `# Chat: ${history.chatId}\n\n`;
    md += `**Created:** ${history.metadata.createdAt}  \n`;
    md += `**Messages:** ${history.metadata.messageCount}\n\n`;
    md += `---\n\n`;

    history.messages.forEach((msg, index) => {
      md += `### Message ${index + 1} - ${msg.role}\n\n`;
      md += `*${msg.timestamp}*\n\n`;
      md += `${typeof msg.content === 'string' ? msg.content : '```json\n' + JSON.stringify(msg.content, null, 2) + '\n```'}\n\n`;
      md += `---\n\n`;
    });

    return md;
  }

  /**
   * Convert chat to HTML format
   */
  chatToHTML(history) {
    let html = '<div class="chat-history">';
    html += `<h2>Chat: ${history.chatId}</h2>`;
    html += `<p>Created: ${history.metadata.createdAt}</p>`;
    html += `<p>Messages: ${history.metadata.messageCount}</p>`;
    html += '<hr>';

    history.messages.forEach((msg, index) => {
      html += `<div class="message message-${msg.role}">`;
      html += `<div class="message-header">`;
      html += `<strong>${msg.role}</strong>`;
      html += `<span>${msg.timestamp}</span>`;
      html += `</div>`;
      html += `<div class="message-content">`;
      html += typeof msg.content === 'string' ? msg.content : `<pre>${JSON.stringify(msg.content, null, 2)}</pre>`;
      html += `</div>`;
      html += `</div>`;
    });

    html += '</div>';
    return html;
  }

  /**
   * Import chat history
   */
  importChatHistory(chatId, data, format = 'json') {
    let history;

    if (format === 'json') {
      history = typeof data === 'string' ? JSON.parse(data) : data;
    } else {
      throw new Error('Only JSON format is supported for import');
    }

    const histories = this.getAllHistories();
    histories[chatId] = history;
    this.saveAllHistories(histories);

    return history;
  }

  /**
   * Cleanup old chats
   */
  cleanupOldChats(histories) {
    const chatIds = Object.keys(histories);
    
    if (chatIds.length <= this.maxChats) {
      return;
    }

    // Sort by updatedAt
    const sorted = chatIds.sort((a, b) => {
      const dateA = new Date(histories[a].metadata.updatedAt);
      const dateB = new Date(histories[b].metadata.updatedAt);
      return dateA - dateB;
    });

    // Remove oldest chats
    const toRemove = sorted.slice(0, chatIds.length - this.maxChats);
    toRemove.forEach(chatId => {
      delete histories[chatId];
    });
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const histories = this.getAllHistories();
    const historiesJson = JSON.stringify(histories);
    const chatIds = Object.keys(histories);

    const totalMessages = chatIds.reduce((sum, chatId) => {
      return sum + histories[chatId].messages.length;
    }, 0);

    return {
      totalChats: chatIds.length,
      totalMessages,
      storageUsed: historiesJson.length,
      storageUsedFormatted: formatBytes(historiesJson.length),
      chatIds,
      averageMessagesPerChat: chatIds.length > 0 ? Math.round(totalMessages / chatIds.length) : 0
    };
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Merge chat histories
   */
  mergeChats(targetChatId, sourceChatIds) {
    const histories = this.getAllHistories();
    const targetChat = this.getChatHistory(targetChatId);

    sourceChatIds.forEach(sourceChatId => {
      if (histories[sourceChatId]) {
        targetChat.messages.push(...histories[sourceChatId].messages);
      }
    });

    // Sort by timestamp
    targetChat.messages.sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    targetChat.metadata.updatedAt = new Date().toISOString();
    targetChat.metadata.messageCount = targetChat.messages.length;

    histories[targetChatId] = targetChat;
    this.saveAllHistories(histories);

    return targetChat;
  }

  /**
   * Get context window (last N messages formatted for API)
   */
  getContextWindow(chatId, maxMessages = null) {
    const history = this.getChatHistory(chatId);
    let messages = history.messages;

    if (maxMessages && maxMessages > 0) {
      messages = messages.slice(-maxMessages);
    }

    // Return messages with all necessary fields for API
    return messages.map(msg => {
      const formatted = { role: msg.role, content: msg.content };
      if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;
      if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
      return formatted;
    });
  }
}

export default ChatHistoryManager;
