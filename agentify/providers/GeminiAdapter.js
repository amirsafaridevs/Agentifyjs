import { BaseAdapter } from './BaseAdapter.js';

/**
 * Adapter for Google Gemini API
 */
export class GeminiAdapter extends BaseAdapter {
  /**
   * Format request for Gemini
   */
  formatRequest(messages, tools, config) {
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const request = {
      contents,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens || 2048
      }
    };

    if (systemInstruction) {
      request.systemInstruction = {
        parts: [{ text: systemInstruction.content }]
      };
    }

    if (tools && tools.length > 0) {
      request.tools = [{
        functionDeclarations: this.formatTools(tools)
      }];
    }

    return request;
  }

  /**
   * Format tools for Gemini
   */
  formatTools(tools) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters || {
        type: 'object',
        properties: {}
      }
    }));
  }

  /**
   * Parse Gemini response
   */
  parseResponse(data) {
    if (!data.candidates || data.candidates.length === 0) {
      throw this.errorManager.createModelError(
        'No candidates in response',
        'MDL_INVALID_RESPONSE',
        { response: data }
      );
    }

    const candidate = data.candidates[0];
    const content = candidate.content;

    let textContent = '';
    const toolCalls = [];

    if (content && content.parts) {
      for (const part of content.parts) {
        if (part.text) {
          textContent += part.text;
        } else if (part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args
          });
        }
      }
    }

    return {
      content: textContent,
      toolCalls,
      finishReason: candidate.finishReason,
      usage: data.usageMetadata
    };
  }

  /**
   * Get API endpoint with API key
   */
  getEndpoint() {
    const baseUrl = this.config.get('apiUrl');
    const apiKey = this.config.get('apiKey');
    const stream = this.config.get('stream');
    
    // Gemini uses API key in URL
    const url = new URL(baseUrl);
    url.searchParams.set('key', apiKey);
    
    if (stream) {
      // Add streamGenerateContent if streaming
      if (!baseUrl.includes('streamGenerateContent')) {
        url.pathname = url.pathname.replace('generateContent', 'streamGenerateContent');
      }
    }
    
    return url.toString();
  }

  /**
   * Get request headers for Gemini
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json'
      // API key is in URL for Gemini
    };
  }

  /**
   * Format tool results for next request
   */
  formatToolResults(toolCalls, results) {
    return {
      role: 'function',
      parts: toolCalls.map((call, index) => ({
        functionResponse: {
          name: call.name,
          response: results[index]
        }
      }))
    };
  }
}

export default GeminiAdapter;
