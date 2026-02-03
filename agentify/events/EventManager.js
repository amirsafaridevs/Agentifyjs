import { StorageError } from '../errors/ErrorTypes.js';
import { formatBytes } from '../utils/formatters.js';

/**
 * Event types for logging
 */
export const EventTypes = {
  // Message events
  USER_MESSAGE_SENT: 'user_message_sent',
  ASSISTANT_MESSAGE_STARTED: 'assistant_message_started',
  ASSISTANT_MESSAGE_COMPLETED: 'assistant_message_completed',
  ASSISTANT_TOKEN_RECEIVED: 'assistant_token_received',
  
  // Tool events
  TOOL_CALL_INITIATED: 'tool_call_initiated',
  TOOL_CALL_COMPLETED: 'tool_call_completed',
  TOOL_CALL_FAILED: 'tool_call_failed',
  
  // Thinking events
  THINKING_STARTED: 'thinking_started',
  THINKING_UPDATED: 'thinking_updated',
  THINKING_STOPPED: 'thinking_stopped',
  
  // API events
  API_REQUEST_SENT: 'api_request_sent',
  API_RESPONSE_RECEIVED: 'api_response_received',
  API_REQUEST_FAILED: 'api_request_failed',
  
  // System events
  AGENT_INITIALIZED: 'agent_initialized',
  CONFIG_UPDATED: 'config_updated',
  ERROR_OCCURRED: 'error_occurred',
  
  // Stream events
  STREAM_STARTED: 'stream_started',
  STREAM_CHUNK_RECEIVED: 'stream_chunk_received',
  STREAM_COMPLETED: 'stream_completed',
  STREAM_ERROR: 'stream_error'
};

/**
 * Manages event logging to browser storage
 */
export class EventManager {
  constructor(storageKey = 'agentify_events', errorManager) {
    this.storageKey = storageKey;
    this.errorManager = errorManager;
    this.maxEvents = 5000;
    this.compressionThreshold = 3000;
    this.currentChatId = null;
    
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
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set current chat ID
   */
  setChatId(chatId) {
    this.currentChatId = chatId;
    return this;
  }

  /**
   * Get current chat ID
   */
  getChatId() {
    return this.currentChatId;
  }

  /**
   * Generate new chat ID
   */
  generateChatId() {
    this.currentChatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this.currentChatId;
  }

  /**
   * Log an event
   */
  logEvent(eventType, data = {}, chatId = null) {
    try {
      const eventId = this.generateEventId();
      const timestamp = new Date();
      
      const event = {
        id: eventId,
        type: eventType,
        chatId: chatId || this.currentChatId,
        timestamp: timestamp.toISOString(),
        date: timestamp.toLocaleDateString('fa-IR'),
        time: timestamp.toLocaleTimeString('fa-IR'),
        unixTimestamp: timestamp.getTime(),
        data: this.sanitizeData(data)
      };

      const events = this.getEvents();
      events.push(event);

      // Trim if exceeds max
      if (events.length > this.maxEvents) {
        events.splice(0, events.length - this.maxEvents);
      }

      this.saveEvents(events);
      
      return event;
    } catch (error) {
      console.error('Failed to log event:', error);
      return null;
    }
  }

  /**
   * Sanitize data to prevent circular references and large objects
   */
  sanitizeData(data) {
    try {
      // Convert to JSON and back to remove functions and circular refs
      const stringified = JSON.stringify(data, (key, value) => {
        // Handle special types
        if (value instanceof Error) {
          return {
            message: value.message,
            stack: value.stack,
            name: value.name
          };
        }
        
        // Limit string length
        if (typeof value === 'string' && value.length > 10000) {
          return value.substring(0, 10000) + '... [truncated]';
        }
        
        return value;
      });
      
      return JSON.parse(stringified);
    } catch (error) {
      return { error: 'Failed to sanitize data', original: String(data) };
    }
  }

  /**
   * Log user message sent
   */
  logUserMessage(message, metadata = {}) {
    return this.logEvent(EventTypes.USER_MESSAGE_SENT, {
      message,
      messageLength: typeof message === 'string' ? message.length : 0,
      metadata
    });
  }

  /**
   * Log assistant message started
   */
  logAssistantMessageStarted(metadata = {}) {
    return this.logEvent(EventTypes.ASSISTANT_MESSAGE_STARTED, {
      startTime: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log assistant message completed
   */
  logAssistantMessageCompleted(message, duration = null, metadata = {}) {
    return this.logEvent(EventTypes.ASSISTANT_MESSAGE_COMPLETED, {
      message,
      messageLength: typeof message === 'string' ? message.length : 0,
      duration,
      endTime: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log assistant token received (for streaming)
   */
  logToken(token, position = null) {
    return this.logEvent(EventTypes.ASSISTANT_TOKEN_RECEIVED, {
      token,
      tokenLength: token.length,
      position
    });
  }

  /**
   * Log tool call initiated
   */
  logToolCallInitiated(toolName, parameters, metadata = {}) {
    return this.logEvent(EventTypes.TOOL_CALL_INITIATED, {
      toolName,
      parameters,
      parametersJson: JSON.stringify(parameters),
      startTime: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log tool call completed
   */
  logToolCallCompleted(toolName, parameters, result, duration = null, metadata = {}) {
    return this.logEvent(EventTypes.TOOL_CALL_COMPLETED, {
      toolName,
      parameters,
      result,
      resultJson: JSON.stringify(result),
      duration,
      endTime: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log tool call failed
   */
  logToolCallFailed(toolName, parameters, error, metadata = {}) {
    return this.logEvent(EventTypes.TOOL_CALL_FAILED, {
      toolName,
      parameters,
      error: error.message || error,
      errorDetails: error.details || {},
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log API request sent
   */
  logApiRequest(endpoint, method, body, metadata = {}) {
    return this.logEvent(EventTypes.API_REQUEST_SENT, {
      endpoint,
      method,
      body: this.sanitizeData(body),
      bodySize: JSON.stringify(body).length,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log API response received
   */
  logApiResponse(endpoint, statusCode, response, duration = null, metadata = {}) {
    return this.logEvent(EventTypes.API_RESPONSE_RECEIVED, {
      endpoint,
      statusCode,
      response: this.sanitizeData(response),
      responseSize: JSON.stringify(response).length,
      duration,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log API request failed
   */
  logApiRequestFailed(endpoint, error, metadata = {}) {
    return this.logEvent(EventTypes.API_REQUEST_FAILED, {
      endpoint,
      error: error.message || error,
      errorCode: error.code,
      errorDetails: error.details || {},
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log thinking status
   */
  logThinkingStarted(action, metadata = {}) {
    return this.logEvent(EventTypes.THINKING_STARTED, {
      action,
      startTime: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Log error occurred
   */
  logError(error, context = '', metadata = {}) {
    return this.logEvent(EventTypes.ERROR_OCCURRED, {
      error: error.message || error,
      errorType: error.name,
      errorCode: error.code,
      errorDetails: error.details || {},
      context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  /**
   * Get all events
   */
  getEvents(filter = {}) {
    try {
      const eventsJson = localStorage.getItem(this.storageKey);
      
      if (!eventsJson) {
        return [];
      }

      let events = JSON.parse(eventsJson);

      // Apply filters
      if (filter.type) {
        if (Array.isArray(filter.type)) {
          events = events.filter(e => filter.type.includes(e.type));
        } else {
          events = events.filter(e => e.type === filter.type);
        }
      }

      if (filter.chatId) {
        events = events.filter(e => e.chatId === filter.chatId);
      }

      if (filter.since) {
        const sinceDate = new Date(filter.since);
        events = events.filter(e => new Date(e.timestamp) >= sinceDate);
      }

      if (filter.until) {
        const untilDate = new Date(filter.until);
        events = events.filter(e => new Date(e.timestamp) <= untilDate);
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        events = events.filter(e => {
          const dataStr = JSON.stringify(e.data).toLowerCase();
          return dataStr.includes(searchLower) || e.type.includes(searchLower);
        });
      }

      if (filter.limit) {
        events = events.slice(-filter.limit);
      }

      return events;
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to read events',
        StorageError.codes.READ_FAILED,
        { filter, originalError: error.message }
      );
    }
  }

  /**
   * Get single event by ID
   */
  getEvent(eventId) {
    const events = this.getEvents();
    return events.find(e => e.id === eventId);
  }

  /**
   * Get events by chat ID
   */
  getEventsByChatId(chatId) {
    return this.getEvents({ chatId });
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.getEvents({ type });
  }

  /**
   * Save events to localStorage
   */
  saveEvents(events) {
    try {
      const eventsJson = JSON.stringify(events);
      localStorage.setItem(this.storageKey, eventsJson);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Try to compress old events
        this.compressOldEvents(events);
        
        try {
          const eventsJson = JSON.stringify(events);
          localStorage.setItem(this.storageKey, eventsJson);
        } catch {
          throw this.errorManager.createStorageError(
            'Storage quota exceeded even after compression',
            StorageError.codes.QUOTA_EXCEEDED,
            {
              eventCount: events.length,
              storageUsed: this.getStorageUsage()
            }
          );
        }
      } else {
        throw this.errorManager.createStorageError(
          'Failed to save events',
          StorageError.codes.WRITE_FAILED,
          { originalError: error.message }
        );
      }
    }
  }

  /**
   * Compress old events to save space
   */
  compressOldEvents(events) {
    if (events.length <= this.compressionThreshold) {
      return;
    }

    const keepCount = Math.floor(this.compressionThreshold / 2);
    const oldEvents = events.slice(0, events.length - keepCount);

    // Remove large data from old events
    oldEvents.forEach(event => {
      if (event.data) {
        // Keep only essential info
        const compressed = {
          type: event.type,
          chatId: event.chatId,
          timestamp: event.timestamp,
          summary: this.createEventSummary(event)
        };
        event.data = compressed;
      }
    });

    events.splice(0, oldEvents.length, ...oldEvents);
  }

  /**
   * Create event summary
   */
  createEventSummary(event) {
    switch (event.type) {
      case EventTypes.USER_MESSAGE_SENT:
        return `User sent message (${event.data.messageLength} chars)`;
      case EventTypes.ASSISTANT_MESSAGE_COMPLETED:
        return `Assistant replied (${event.data.messageLength} chars)`;
      case EventTypes.TOOL_CALL_COMPLETED:
        return `Tool ${event.data.toolName} executed`;
      default:
        return event.type;
    }
  }

  /**
   * Export events in specified format
   */
  exportEvents(format = 'json', filter = {}) {
    const events = this.getEvents(filter);

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(events, null, 2);
      
      case 'csv':
        return this.eventsToCSV(events);
      
      case 'text':
        return this.eventsToText(events);
      
      case 'table':
        return this.eventsToTable(events);
      
      default:
        return JSON.stringify(events);
    }
  }

  /**
   * Convert events to CSV
   */
  eventsToCSV(events) {
    if (events.length === 0) {
      return 'id,type,chatId,timestamp,date,time';
    }

    const headers = 'id,type,chatId,timestamp,date,time,data';
    const rows = events.map(event => {
      return [
        event.id,
        event.type,
        event.chatId || '',
        event.timestamp,
        event.date,
        event.time,
        JSON.stringify(event.data).replace(/"/g, '""')
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Convert events to text
   */
  eventsToText(events) {
    return events.map(event => {
      return `
Event: ${event.id}
Type: ${event.type}
Chat ID: ${event.chatId || 'N/A'}
Date: ${event.date}
Time: ${event.time}
Timestamp: ${event.timestamp}
Data: ${JSON.stringify(event.data, null, 2)}
${'='.repeat(80)}
      `.trim();
    }).join('\n\n');
  }

  /**
   * Convert events to HTML table
   */
  eventsToTable(events) {
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    html += '<thead><tr>';
    html += '<th>ID</th><th>Type</th><th>Chat ID</th><th>Date</th><th>Time</th><th>Data</th>';
    html += '</tr></thead><tbody>';

    events.forEach(event => {
      html += '<tr>';
      html += `<td>${event.id}</td>`;
      html += `<td>${event.type}</td>`;
      html += `<td>${event.chatId || 'N/A'}</td>`;
      html += `<td>${event.date}</td>`;
      html += `<td>${event.time}</td>`;
      html += `<td><pre>${JSON.stringify(event.data, null, 2)}</pre></td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Clear all events
   */
  clearEvents() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to clear events',
        StorageError.codes.WRITE_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete events by chat ID
   */
  deleteEventsByChatId(chatId) {
    const events = this.getEvents();
    const filteredEvents = events.filter(e => e.chatId !== chatId);
    
    this.saveEvents(filteredEvents);
    return events.length - filteredEvents.length;
  }

  /**
   * Delete old events
   */
  deleteOldEvents(olderThan) {
    const cutoffDate = new Date(olderThan);
    const events = this.getEvents();
    const filteredEvents = events.filter(e => new Date(e.timestamp) >= cutoffDate);
    
    this.saveEvents(filteredEvents);
    return events.length - filteredEvents.length;
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const events = this.getEvents();
    const eventsJson = JSON.stringify(events);
    
    const typeCounts = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    const chatIds = [...new Set(events.map(e => e.chatId).filter(Boolean))];

    return {
      totalEvents: events.length,
      storageUsed: eventsJson.length,
      storageUsedFormatted: formatBytes(eventsJson.length),
      typeCounts,
      uniqueChatIds: chatIds.length,
      chatIds,
      oldestEvent: events.length > 0 ? events[0].timestamp : null,
      newestEvent: events.length > 0 ? events[events.length - 1].timestamp : null
    };
  }

  /**
   * Get storage usage
   */
  getStorageUsage() {
    const eventsJson = localStorage.getItem(this.storageKey) || '';
    return {
      bytes: eventsJson.length,
      formatted: formatBytes(eventsJson.length)
    };
  }

  /**
   * Get event count
   */
  getEventCount() {
    return this.getEvents().length;
  }

  /**
   * Get chat IDs
   */
  getChatIds() {
    const events = this.getEvents();
    const chatIds = [...new Set(events.map(e => e.chatId).filter(Boolean))];
    return chatIds;
  }

  /**
   * Get event timeline for a chat
   */
  getChatTimeline(chatId) {
    const events = this.getEventsByChatId(chatId);
    
    return events.map(event => ({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      time: event.time,
      summary: this.createEventSummary(event),
      data: event.data
    }));
  }
}

export default EventManager;
