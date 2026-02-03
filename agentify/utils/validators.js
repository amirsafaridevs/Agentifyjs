import { SystemError } from '../errors/ErrorTypes.js';

/**
 * Validate configuration object
 */
export function validateConfig(config) {
  if (typeof config !== 'object' || config === null) {
    throw new SystemError(
      'Configuration must be an object',
      SystemError.codes.CONFIG_INVALID,
      { providedType: typeof config }
    );
  }

  if (config.apiUrl && typeof config.apiUrl !== 'string') {
    throw new SystemError(
      'API URL must be a string',
      SystemError.codes.INVALID_PARAMETER,
      { parameter: 'apiUrl', providedType: typeof config.apiUrl }
    );
  }

  if (config.apiKey && typeof config.apiKey !== 'string') {
    throw new SystemError(
      'API key must be a string',
      SystemError.codes.INVALID_PARAMETER,
      { parameter: 'apiKey', providedType: typeof config.apiKey }
    );
  }

  if (config.model && typeof config.model !== 'string') {
    throw new SystemError(
      'Model must be a string',
      SystemError.codes.INVALID_PARAMETER,
      { parameter: 'model', providedType: typeof config.model }
    );
  }

  if (config.temperature !== undefined) {
    if (typeof config.temperature !== 'number') {
      throw new SystemError(
        'Temperature must be a number',
        SystemError.codes.INVALID_PARAMETER,
        { parameter: 'temperature', providedType: typeof config.temperature }
      );
    }
    if (config.temperature < 0 || config.temperature > 2) {
      throw new SystemError(
        'Temperature must be between 0 and 2',
        SystemError.codes.VALIDATION_FAILED,
        { parameter: 'temperature', value: config.temperature }
      );
    }
  }

  if (config.maxTokens !== undefined && config.maxTokens !== null) {
    if (typeof config.maxTokens !== 'number' || config.maxTokens <= 0) {
      throw new SystemError(
        'Max tokens must be a positive number',
        SystemError.codes.INVALID_PARAMETER,
        { parameter: 'maxTokens', value: config.maxTokens }
      );
    }
  }

  return true;
}

/**
 * Validate tool definition
 */
export function validateTool(tool) {
  if (typeof tool !== 'object' || tool === null) {
    throw new SystemError(
      'Tool must be an object',
      SystemError.codes.INVALID_PARAMETER,
      { providedType: typeof tool }
    );
  }

  if (!tool.name || typeof tool.name !== 'string') {
    throw new SystemError(
      'Tool must have a name (string)',
      SystemError.codes.VALIDATION_FAILED,
      { tool }
    );
  }

  if (!tool.description || typeof tool.description !== 'string') {
    throw new SystemError(
      'Tool must have a description (string)',
      SystemError.codes.VALIDATION_FAILED,
      { toolName: tool.name }
    );
  }

  if (tool.parameters && typeof tool.parameters !== 'object') {
    throw new SystemError(
      'Tool parameters must be an object',
      SystemError.codes.VALIDATION_FAILED,
      { toolName: tool.name, providedType: typeof tool.parameters }
    );
  }

  if (tool.execute && typeof tool.execute !== 'function') {
    throw new SystemError(
      'Tool execute must be a function',
      SystemError.codes.VALIDATION_FAILED,
      { toolName: tool.name, providedType: typeof tool.execute }
    );
  }

  return true;
}

/**
 * Validate message format
 */
export function validateMessage(message) {
  if (typeof message !== 'string' && typeof message !== 'object') {
    throw new SystemError(
      'Message must be a string or object',
      SystemError.codes.INVALID_PARAMETER,
      { providedType: typeof message }
    );
  }

  if (typeof message === 'string' && message.trim().length === 0) {
    throw new SystemError(
      'Message cannot be empty',
      SystemError.codes.VALIDATION_FAILED,
      { message }
    );
  }

  return true;
}

/**
 * Validate URL format
 */
export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    throw new SystemError(
      'Invalid URL format',
      SystemError.codes.VALIDATION_FAILED,
      { url }
    );
  }
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new SystemError(
      'API key must be a non-empty string',
      SystemError.codes.CONFIG_MISSING,
      { parameter: 'apiKey' }
    );
  }

  if (apiKey.trim().length < 10) {
    throw new SystemError(
      'API key appears to be invalid (too short)',
      SystemError.codes.VALIDATION_FAILED,
      { parameter: 'apiKey', length: apiKey.length }
    );
  }

  return true;
}
