/**
 * Format tool parameters for API calls
 */
export function formatToolParameters(parameters) {
  if (!parameters || typeof parameters !== 'object' || Object.keys(parameters).length === 0) {
    return { type: 'object', properties: {} };
  }

  const formatted = {
    type: 'object',
    properties: {},
    required: []
  };

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'object' && value !== null) {
      // Check if it has 'required' field and extract it
      const isRequired = value.required === true;
      
      // Create a clean copy without the 'required' field
      const { required, ...cleanValue } = value;
      formatted.properties[key] = cleanValue;
      
      if (isRequired) {
        formatted.required.push(key);
      }
    } else {
      // Simple format: { paramName: 'string' }
      formatted.properties[key] = { type: value };
    }
  }

  if (formatted.required.length === 0) {
    delete formatted.required;
  }

  return formatted;
}

/**
 * Format messages for different providers
 */
export function formatMessages(messages, systemInstruction = null) {
  const formatted = [];

  if (systemInstruction) {
    formatted.push({
      role: 'system',
      content: systemInstruction
    });
  }

  for (const msg of messages) {
    if (typeof msg === 'string') {
      formatted.push({
        role: 'user',
        content: msg
      });
    } else if (typeof msg === 'object' && msg !== null) {
      formatted.push(msg);
    }
  }

  return formatted;
}

/**
 * Format thinking content for display
 */
export function formatThinkingContent(content) {
  if (!content) return '';
  
  // Remove XML-like tags if present
  const cleaned = content
    .replace(/<thinking>/gi, '')
    .replace(/<\/thinking>/gi, '')
    .trim();

  return cleaned;
}

/**
 * Truncate text for display
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Parse timestamp to relative time
 */
export function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now - then;

  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}
