import { validateConfig } from '../utils/validators.js';
import { SystemError } from '../errors/ErrorTypes.js';

/**
 * Manages configuration for the Agentify instance
 */
export class ConfigManager {
  constructor(initialConfig = {}) {
    this.config = {
      model: null,
      apiUrl: null,
      apiKey: null,
      provider: 'custom',
      temperature: 0.7,
      maxTokens: null,
      stream: true,
      timeout: 60000, // 60 seconds
      retryAttempts: 3,
      retryDelay: 1000
    };

    if (Object.keys(initialConfig).length > 0) {
      this.updateConfig(initialConfig);
    }
  }

  /**
   * Update configuration with validation
   */
  updateConfig(newConfig) {
    validateConfig(newConfig);
    this.config = { ...this.config, ...newConfig };
    
    // Auto-detect provider from URL if not specified
    if (newConfig.apiUrl && !newConfig.provider) {
      this.config.provider = this.detectProvider(newConfig.apiUrl);
    }

    return this.config;
  }

  /**
   * Set a single configuration value
   */
  set(key, value) {
    if (!(key in this.config)) {
      throw new SystemError(
        `Unknown configuration key: ${key}`,
        SystemError.codes.INVALID_PARAMETER,
        { key, availableKeys: Object.keys(this.config) }
      );
    }

    const tempConfig = { [key]: value };
    validateConfig(tempConfig);
    this.config[key] = value;

    return this.config;
  }

  /**
   * Get a configuration value
   */
  get(key) {
    if (!(key in this.config)) {
      throw new SystemError(
        `Unknown configuration key: ${key}`,
        SystemError.codes.INVALID_PARAMETER,
        { key, availableKeys: Object.keys(this.config) }
      );
    }

    return this.config[key];
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Detect provider from API URL
   */
  detectProvider(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('openai.com')) {
      return 'openai';
    } else if (urlLower.includes('anthropic.com')) {
      return 'anthropic';
    } else if (urlLower.includes('googleapis.com') || urlLower.includes('generativelanguage')) {
      return 'gemini';
    } else if (urlLower.includes('deepseek.com')) {
      return 'deepseek';
    }
    
    return 'custom';
  }

  /**
   * Validate that required configuration is present
   */
  validateRequired() {
    const errors = [];

    if (!this.config.apiUrl) {
      errors.push('API URL is required');
    }

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    if (!this.config.model) {
      errors.push('Model is required');
    }

    if (errors.length > 0) {
      throw new SystemError(
        'Required configuration is missing',
        SystemError.codes.CONFIG_MISSING,
        { missingFields: errors }
      );
    }

    return true;
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig() {
    const provider = this.config.provider;
    
    const baseConfig = {
      model: this.config.model,
      temperature: this.config.temperature,
      stream: this.config.stream
    };

    if (this.config.maxTokens) {
      baseConfig.max_tokens = this.config.maxTokens;
    }

    switch (provider) {
      case 'openai':
        return {
          ...baseConfig,
          // OpenAI specific config
        };
      
      case 'anthropic':
        return {
          ...baseConfig,
          // Anthropic specific config
        };
      
      case 'gemini':
        return {
          ...baseConfig,
          // Gemini specific config
        };
      
      case 'deepseek':
        return {
          ...baseConfig,
          // DeepSeek specific config
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    const provider = this.config.provider;

    switch (provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      
      case 'anthropic':
        headers['x-api-key'] = this.config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      
      case 'gemini':
        // Gemini uses API key in URL
        break;
      
      case 'deepseek':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      
      default:
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = {
      model: null,
      apiUrl: null,
      apiKey: null,
      provider: 'custom',
      temperature: 0.7,
      maxTokens: null,
      stream: true,
      timeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000
    };

    return this.config;
  }
}

export default ConfigManager;
