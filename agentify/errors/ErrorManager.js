import {
  AgentifyError,
  SystemError,
  NetworkError,
  ModelError,
  ToolError,
  StreamError,
  StorageError
} from './ErrorTypes.js';

/**
 * Central error management and handling
 */
export class ErrorManager {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * Log an error
   */
  logError(error) {
    this.errorLog.push({
      error: error instanceof AgentifyError ? error.toJSON() : error,
      timestamp: new Date().toISOString()
    });

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Create a system error
   */
  createSystemError(message, code, details) {
    const error = new SystemError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Create a network error
   */
  createNetworkError(message, code, details) {
    const error = new NetworkError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Create a model error
   */
  createModelError(message, code, details) {
    const error = new ModelError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Create a tool error
   */
  createToolError(message, code, details) {
    const error = new ToolError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Create a stream error
   */
  createStreamError(message, code, details) {
    const error = new StreamError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Create a storage error
   */
  createStorageError(message, code, details) {
    const error = new StorageError(message, code, details);
    this.logError(error);
    return error;
  }

  /**
   * Handle fetch response errors
   */
  async handleFetchError(response, endpoint) {
    let errorDetails = {
      statusCode: response.status,
      statusText: response.statusText,
      endpoint
    };

    try {
      const body = await response.text();
      try {
        errorDetails.responseBody = JSON.parse(body);
      } catch {
        errorDetails.responseBody = body;
      }
    } catch {
      errorDetails.responseBody = 'Could not read response body';
    }

    let code;
    let message;

    switch (response.status) {
      case 401:
        code = NetworkError.codes.UNAUTHORIZED;
        message = 'API key is invalid or missing';
        break;
      case 403:
        code = NetworkError.codes.FORBIDDEN;
        message = 'Access forbidden - check API permissions';
        break;
      case 404:
        code = NetworkError.codes.NOT_FOUND;
        message = 'API endpoint not found';
        break;
      case 429:
        code = NetworkError.codes.RATE_LIMIT;
        message = 'Rate limit exceeded';
        errorDetails.retryAfter = response.headers.get('Retry-After');
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = NetworkError.codes.SERVER_ERROR;
        message = 'API server error';
        break;
      default:
        code = NetworkError.codes.INVALID_RESPONSE;
        message = `Unexpected response status: ${response.status}`;
    }

    return this.createNetworkError(message, code, errorDetails);
  }

  /**
   * Wrap and handle unknown errors
   */
  wrapError(error, context = '') {
    if (error instanceof AgentifyError) {
      return error;
    }

    const wrappedError = new AgentifyError(
      error.message || 'Unknown error occurred',
      'UNKNOWN_ERROR',
      {
        context,
        originalError: error.toString(),
        originalStack: error.stack
      }
    );

    this.logError(wrappedError);
    return wrappedError;
  }
}

export default ErrorManager;
