import { BaseAdapter } from './BaseAdapter.js';

/**
 * Adapter for OpenAI API
 */
export class OpenAIAdapter extends BaseAdapter {
  /**
   * Format request for OpenAI
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
      request.tool_choice = 'auto';
    }

    return request;
  }

  /**
   * Format tools for OpenAI / DeepSeek (accepts both flat and nested tool definitions)
   */
  formatTools(tools) {
    return tools.map(tool => {
      const fn = tool.function || tool;
      const name = fn.name ?? tool.name ?? '';
      const description = fn.description ?? tool.description ?? '';
      const parameters = fn.parameters ?? tool.parameters ?? { type: 'object', properties: {} };
      return {
        type: 'function',
        function: {
          name,
          description,
          parameters
        }
      };
    });
  }

  /**
   * Parse OpenAI response
   */
  parseResponse(data) {
    if (!data.choices || data.choices.length === 0) {
      throw this.errorManager.createModelError(
        'No choices in response',
        'MDL_INVALID_RESPONSE',
        { response: data }
      );
    }

    const choice = data.choices[0];
    const message = choice.message;

    return {
      content: message.content || '',
      toolCalls: this.extractToolCalls(message),
      finishReason: choice.finish_reason,
      usage: data.usage
    };
  }

  /**
   * Extract tool calls from OpenAI message
   */
  extractToolCalls(message) {
    if (!message.tool_calls) {
      return [];
    }

    return message.tool_calls.map(call => ({
      id: call.id,
      type: call.type,
      name: call.function.name,
      arguments: this.parseToolArguments(call.function.arguments)
    }));
  }

  /**
   * Parse tool arguments (may be string or object)
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
    return toolCalls.map((call, index) => ({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(results[index])
    }));
  }
}

export default OpenAIAdapter;
