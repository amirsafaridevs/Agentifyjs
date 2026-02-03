/**
 * Base error class for all Agentify errors
 */
export class AgentifyError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AgentifyError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for console output with detailed information
   */
  toConsole() {
    const lines = [
      `\n${'='.repeat(80)}`,
      `[${this.name}] ${this.code}`,
      `${'='.repeat(80)}`,
      `Message: ${this.message}`,
      `Timestamp: ${this.timestamp}`,
      `\nDetails:`,
      JSON.stringify(this.details, null, 2),
      `\nStack Trace:`,
      this.stack,
      `${'='.repeat(80)}\n`
    ];
    return lines.join('\n');
  }

  /**
   * Format error for HTML display
   */
  toHTML() {
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    return `
      <div style="
        background: #fee;
        border-left: 4px solid #c00;
        padding: 16px;
        margin: 16px 0;
        font-family: monospace;
        border-radius: 4px;
      ">
        <div style="color: #c00; font-weight: bold; font-size: 16px; margin-bottom: 8px;">
          [${escapeHtml(this.name)}] ${escapeHtml(this.code)}
        </div>
        <div style="color: #333; margin-bottom: 8px;">
          <strong>Message:</strong> ${escapeHtml(this.message)}
        </div>
        <div style="color: #666; font-size: 12px; margin-bottom: 8px;">
          <strong>Timestamp:</strong> ${escapeHtml(this.timestamp)}
        </div>
        <details style="margin-top: 8px;">
          <summary style="cursor: pointer; color: #555; font-weight: bold;">
            Details
          </summary>
          <pre style="
            background: #f5f5f5;
            padding: 8px;
            margin-top: 8px;
            overflow-x: auto;
            border-radius: 4px;
          ">${escapeHtml(JSON.stringify(this.details, null, 2))}</pre>
        </details>
        <details style="margin-top: 8px;">
          <summary style="cursor: pointer; color: #555; font-weight: bold;">
            Stack Trace
          </summary>
          <pre style="
            background: #f5f5f5;
            padding: 8px;
            margin-top: 8px;
            overflow-x: auto;
            font-size: 11px;
            border-radius: 4px;
          ">${escapeHtml(this.stack || 'No stack trace available')}</pre>
        </details>
      </div>
    `;
  }

  /**
   * Serialize error for logging or backend transmission
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * System errors - Configuration, initialization, validation issues
 */
export class SystemError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'SystemError';
  }

  static codes = {
    CONFIG_INVALID: 'SYS_CONFIG_INVALID',
    CONFIG_MISSING: 'SYS_CONFIG_MISSING',
    INIT_FAILED: 'SYS_INIT_FAILED',
    VALIDATION_FAILED: 'SYS_VALIDATION_FAILED',
    INVALID_PARAMETER: 'SYS_INVALID_PARAMETER',
    MISSING_DEPENDENCY: 'SYS_MISSING_DEPENDENCY'
  };
}

/**
 * Network errors - API communication problems
 */
export class NetworkError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'NetworkError';
  }

  static codes = {
    CONNECTION_FAILED: 'NET_CONNECTION_FAILED',
    TIMEOUT: 'NET_TIMEOUT',
    RATE_LIMIT: 'NET_RATE_LIMIT',
    UNAUTHORIZED: 'NET_UNAUTHORIZED',
    FORBIDDEN: 'NET_FORBIDDEN',
    NOT_FOUND: 'NET_NOT_FOUND',
    SERVER_ERROR: 'NET_SERVER_ERROR',
    INVALID_RESPONSE: 'NET_INVALID_RESPONSE'
  };
}

/**
 * Model errors - AI model response issues
 */
export class ModelError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'ModelError';
  }

  static codes = {
    INVALID_RESPONSE: 'MDL_INVALID_RESPONSE',
    RESPONSE_PARSE_FAILED: 'MDL_RESPONSE_PARSE_FAILED',
    INCOMPLETE_RESPONSE: 'MDL_INCOMPLETE_RESPONSE',
    CONTEXT_LENGTH_EXCEEDED: 'MDL_CONTEXT_LENGTH_EXCEEDED',
    CONTENT_FILTERED: 'MDL_CONTENT_FILTERED',
    INVALID_FUNCTION_CALL: 'MDL_INVALID_FUNCTION_CALL'
  };
}

/**
 * Tool errors - Tool execution failures
 */
export class ToolError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'ToolError';
  }

  static codes = {
    NOT_FOUND: 'TOOL_NOT_FOUND',
    EXEC_FAILED: 'TOOL_EXEC_FAILED',
    INVALID_PARAMS: 'TOOL_INVALID_PARAMS',
    TIMEOUT: 'TOOL_TIMEOUT',
    REGISTRATION_FAILED: 'TOOL_REGISTRATION_FAILED',
    INVALID_DEFINITION: 'TOOL_INVALID_DEFINITION'
  };
}

/**
 * Stream errors - Streaming/parsing problems
 */
export class StreamError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'StreamError';
  }

  static codes = {
    PARSE_FAILED: 'STR_PARSE_FAILED',
    CONNECTION_LOST: 'STR_CONNECTION_LOST',
    INVALID_FORMAT: 'STR_INVALID_FORMAT',
    BUFFER_OVERFLOW: 'STR_BUFFER_OVERFLOW',
    INCOMPLETE_DATA: 'STR_INCOMPLETE_DATA'
  };
}

/**
 * Storage errors - localStorage access issues
 */
export class StorageError extends AgentifyError {
  constructor(message, code, details = {}) {
    super(message, code, details);
    this.name = 'StorageError';
  }

  static codes = {
    QUOTA_EXCEEDED: 'STG_QUOTA_EXCEEDED',
    ACCESS_DENIED: 'STG_ACCESS_DENIED',
    NOT_AVAILABLE: 'STG_NOT_AVAILABLE',
    PARSE_FAILED: 'STG_PARSE_FAILED',
    WRITE_FAILED: 'STG_WRITE_FAILED',
    READ_FAILED: 'STG_READ_FAILED'
  };
}
