import { BaseAdapter } from './BaseAdapter.js';

/**
 * Adapter for Anthropic Claude API
 */
export class AnthropicAdapter extends BaseAdapter {
  /**
   * Format request for Anthropic
   */
  formatRequest(messages, tools, config) {
    // Anthropic requires system message separate
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const request = {
      model: config.model,
      messages: userMessages,
      temperature: config.temperature,
      stream: config.stream
    };

    if (systemMessage) {
      request.system = systemMessage.content;
    }

    if (config.maxTokens) {
      request.max_tokens = config.maxTokens;
    } else {
      // Anthropic requires max_tokens
      request.max_tokens = 4096;
    }

    if (tools && tools.length > 0) {
      request.tools = this.formatTools(tools);
    }

    return request;
  }

  /**
   * Format tools for Anthropic
   */
  formatTools(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters || {
        type: 'object',
        properties: {}
      }
    }));
  }

  /**
   * Parse Anthropic response
   */
  parseResponse(data) {
    if (!data.content || data.content.length === 0) {
      throw this.errorManager.createModelError(
        'No content in response',
        'MDL_INVALID_RESPONSE',
        { response: data }
      );
    }

    let textContent = '';
    const toolCalls = [];
    let thinkingContent = '';

    for (const block of data.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'tool_use',
          name: block.name,
          arguments: block.input
        });
      } else if (block.type === 'thinking') {
        thinkingContent += block.thinking || '';
      }
    }

    return {
      content: textContent,
      toolCalls,
      thinkingContent,
      finishReason: data.stop_reason,
      usage: data.usage
    };
  }

  /**
   * Extract thinking content from Anthropic response
   */
  extractThinking(data) {
    if (!data.content) return null;

    for (const block of data.content) {
      if (block.type === 'thinking') {
        return block.thinking;
      }
    }

    return null;
  }

  /**
   * Format tool results for next request
   */
  formatToolResults(toolCalls, results) {
    return toolCalls.map((call, index) => ({
      type: 'tool_result',
      tool_use_id: call.id,
      content: JSON.stringify(results[index])
    }));
  }

  /**
   * Get request headers for Anthropic
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.get('apiKey'),
      'anthropic-version': '2023-06-01'
    };
  }
}

export default AnthropicAdapter;
