/**
 * Base adapter class for AI providers
 */
export class BaseAdapter {
  constructor(config, errorManager) {
    this.config = config;
    this.errorManager = errorManager;
  }

  /**
   * Format request for the provider
   * Must be implemented by subclasses
   */
  formatRequest(messages, tools, config) {
    throw new Error('formatRequest must be implemented by subclass');
  }

  /**
   * Format tools for the provider
   * Must be implemented by subclasses
   */
  formatTools(tools) {
    throw new Error('formatTools must be implemented by subclass');
  }

  /**
   * Parse response from the provider
   * Must be implemented by subclasses
   */
  parseResponse(response) {
    throw new Error('parseResponse must be implemented by subclass');
  }

  /**
   * Get request headers
   */
  getHeaders() {
    return this.config.getHeaders();
  }

  /**
   * Get API endpoint
   */
  getEndpoint() {
    return this.config.get('apiUrl');
  }

  /**
   * Make API request
   */
  async makeRequest(body, stream = false) {
    const headers = this.getHeaders();
    const endpoint = this.getEndpoint();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw await this.errorManager.handleFetchError(response, endpoint);
    }

    return response;
  }

  /**
   * Extract thinking content from response
   */
  extractThinking(data) {
    // Base implementation - override in subclasses if needed
    return null;
  }

  /**
   * Extract tool calls from response
   */
  extractToolCalls(data) {
    // Base implementation - override in subclasses if needed
    return [];
  }
}

export default BaseAdapter;
