import { BaseAdapter } from './BaseAdapter.js';

/**
 * Adapter for custom/generic API endpoints
 * Uses OpenAI-compatible format by default
 */
export class CustomAdapter extends BaseAdapter {
  /**
   * Format request for custom endpoint
   */
  formatRequest(messages, tools, config) {
    const request = {
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      stream: config.stream
    };

    if (config.maxTokens) {
      request.max_tokens = config.maxTokens;
    }

    if (tools && tools.length > 0) {
      request.tools = this.formatTools(tools);
    }

    // Add any custom config parameters
    if (config.customParams) {
      Object.assign(request, config.customParams);
    }

    return request;
  }

  /**
   * Format tools (OpenAI-compatible format)
   */
  formatTools(tools) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} }
      }
    }));
  }

  /**
   * Parse custom API response
   * Attempts to handle multiple response formats
   */
  parseResponse(data) {
    // Try OpenAI format first
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      const message = choice.message;

      return {
        content: message.content || '',
        toolCalls: this.extractToolCalls(message),
        finishReason: choice.finish_reason,
        usage: data.usage
      };
    }

    // Try Anthropic format
    if (data.content && Array.isArray(data.content)) {
      let textContent = '';
      const toolCalls = [];

      for (const block of data.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input
          });
        }
      }

      return {
        content: textContent,
        toolCalls,
        finishReason: data.stop_reason,
        usage: data.usage
      };
    }

    // Try direct text response
    if (data.text || data.response || data.output) {
      return {
        content: data.text || data.response || data.output,
        toolCalls: [],
        finishReason: 'stop',
        usage: null
      };
    }

    // If nothing matches, throw error
    throw this.errorManager.createModelError(
      'Unable to parse custom API response format',
      'MDL_INVALID_RESPONSE',
      { response: data }
    );
  }

  /**
   * Extract tool calls from message
   */
  extractToolCalls(message) {
    if (!message.tool_calls && !message.function_call) {
      return [];
    }

    // OpenAI tool_calls format
    if (message.tool_calls) {
      return message.tool_calls.map(call => ({
        id: call.id,
        type: call.type,
        name: call.function.name,
        arguments: this.parseToolArguments(call.function.arguments)
      }));
    }

    // Older function_call format
    if (message.function_call) {
      return [{
        name: message.function_call.name,
        arguments: this.parseToolArguments(message.function_call.arguments)
      }];
    }

    return [];
  }

  /**
   * Parse tool arguments
   */
  parseToolArguments(args) {
    if (typeof args === 'string') {
      try {
        return JSON.parse(args);
      } catch {
        return {};
      }
    }
    return args || {};
  }

  /**
   * Format tool results for next request
   */
  formatToolResults(toolCalls, results) {
    // Use OpenAI format by default
    return toolCalls.map((call, index) => ({
      role: 'tool',
      tool_call_id: call.id || `call_${index}`,
      content: JSON.stringify(results[index])
    }));
  }
}

export default CustomAdapter;
