import { StreamError } from '../errors/ErrorTypes.js';
import { formatThinkingContent } from '../utils/formatters.js';

/**
 * Handles streaming responses from AI providers
 */
export class StreamHandler {
  constructor(errorManager) {
    this.errorManager = errorManager;
    this.buffer = '';
    this.isStreaming = false;
    this.toolCallsAccumulator = {};
  }

  /**
   * Handle streaming response
   */
  async handleStream(response, callbacks = {}, provider = 'openai') {
    this.isStreaming = true;
    this.buffer = '';
    this.toolCallsAccumulator = {};

    const {
      onToken = () => {},
      onToolCall = () => {},
      onThinking = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullContent = '';
      let toolCalls = [];
      let toolResults = [];
      let thinkingContent = '';
      let finishReason = 'stop';

      while (this.isStreaming) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        this.buffer += chunk;

        // Process buffer based on provider format
        const processed = await this.processBuffer(provider);

        for (const item of processed) {
          if (item.type === 'token') {
            fullContent += item.content;
            onToken(item.content);
          } else if (item.type === 'thinking') {
            thinkingContent += item.content;
            onThinking(formatThinkingContent(item.content));
          } else if (item.type === 'tool_call') {
            toolCalls.push(item.data);
            const toolResult = onToolCall(item.data);
            if (toolResult && typeof toolResult.then === 'function') {
              const result = await toolResult;
              toolResults.push({ toolCall: item.data, result });
            }
          } else if (item.type === 'finish') {
            finishReason = item.reason || 'stop';
          } else if (item.type === 'error') {
            throw this.errorManager.createStreamError(
              'Stream error received',
              StreamError.codes.PARSE_FAILED,
              { error: item.data }
            );
          }
        }
      }

      const result = {
        content: fullContent,
        toolCalls,
        toolResults,
        thinkingContent,
        finishReason
      };

      onComplete(result);
      return result;

    } catch (error) {
      this.isStreaming = false;
      
      if (error instanceof StreamError) {
        onError(error);
        throw error;
      }

      const streamError = this.errorManager.createStreamError(
        'Stream processing failed',
        StreamError.codes.PARSE_FAILED,
        { originalError: error.message, stack: error.stack }
      );
      
      onError(streamError);
      throw streamError;
    } finally {
      this.isStreaming = false;
      this.buffer = '';
    }
  }

  /**
   * Process buffer based on provider format
   */
  async processBuffer(provider) {
    const processed = [];

    switch (provider) {
      case 'openai':
      case 'deepseek':
        processed.push(...this.processOpenAIBuffer());
        break;
      
      case 'anthropic':
        processed.push(...this.processAnthropicBuffer());
        break;
      
      case 'gemini':
        processed.push(...this.processGeminiBuffer());
        break;
      
      default:
        processed.push(...this.processOpenAIBuffer());
    }

    return processed;
  }

  /**
   * Process OpenAI-format SSE stream
   */
  processOpenAIBuffer() {
    const processed = [];
    const lines = this.buffer.split('\n');
    
    // Keep last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim() || line.trim() === 'data: [DONE]') {
        continue;
      }

      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.substring(6);
          const data = JSON.parse(jsonStr);

          if (data.choices && data.choices[0]) {
            const choice = data.choices[0];
            
            // Regular content delta
            if (choice.delta?.content) {
              processed.push({
                type: 'token',
                content: choice.delta.content
              });
            }

            // Tool calls (accumulate chunks)
            if (choice.delta?.tool_calls) {
              for (const toolCall of choice.delta.tool_calls) {
                const index = toolCall.index ?? 0;
                const id = toolCall.id;
                
                if (!this.toolCallsAccumulator[index]) {
                  this.toolCallsAccumulator[index] = {
                    id: id || '',
                    name: '',
                    arguments: ''
                  };
                }
                
                if (id) {
                  this.toolCallsAccumulator[index].id = id;
                }
                
                if (toolCall.function?.name) {
                  this.toolCallsAccumulator[index].name = toolCall.function.name;
                }
                
                if (toolCall.function?.arguments) {
                  this.toolCallsAccumulator[index].arguments += toolCall.function.arguments;
                }
              }
            }
            
            // When tool_calls finish, emit them
            if (choice.finish_reason === 'tool_calls') {
              for (const [index, accumulated] of Object.entries(this.toolCallsAccumulator)) {
                if (accumulated.name) {
                  processed.push({
                    type: 'tool_call',
                    data: {
                      id: accumulated.id,
                      name: accumulated.name,
                      arguments: accumulated.arguments
                    }
                  });
                }
              }
              this.toolCallsAccumulator = {};
            }

            // Finish reason
            if (choice.finish_reason) {
              processed.push({
                type: 'finish',
                reason: choice.finish_reason
              });
            }
          }
        } catch (error) {
          // Skip malformed JSON
          continue;
        }
      }
    }

    return processed;
  }

  /**
   * Process Anthropic-format stream
   */
  processAnthropicBuffer() {
    const processed = [];
    const lines = this.buffer.split('\n');
    
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      // Anthropic uses different event types
      if (line.startsWith('event: ') || line.startsWith('data: ')) {
        const eventMatch = line.match(/^event: (.+)$/);
        const dataMatch = line.match(/^data: (.+)$/);

        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]);

            // Content block delta
            if (data.type === 'content_block_delta') {
              if (data.delta?.text) {
                processed.push({
                  type: 'token',
                  content: data.delta.text
                });
              }
            }

            // Thinking block
            if (data.type === 'content_block_start' && data.content_block?.type === 'thinking') {
              // Anthropic thinking mode
            }

            // Tool use
            if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
              processed.push({
                type: 'tool_call',
                data: {
                  id: data.content_block.id,
                  name: data.content_block.name,
                  input: data.content_block.input
                }
              });
            }

            // Message stop
            if (data.type === 'message_stop') {
              processed.push({
                type: 'finish',
                reason: 'stop'
              });
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    return processed;
  }

  /**
   * Process Gemini-format stream
   */
  processGeminiBuffer() {
    const processed = [];
    
    // Gemini typically sends complete JSON objects per line
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const data = JSON.parse(line);

        if (data.candidates && data.candidates[0]) {
          const candidate = data.candidates[0];

          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                processed.push({
                  type: 'token',
                  content: part.text
                });
              }

              if (part.functionCall) {
                processed.push({
                  type: 'tool_call',
                  data: {
                    name: part.functionCall.name,
                    arguments: part.functionCall.args
                  }
                });
              }
            }
          }

          if (candidate.finishReason) {
            processed.push({
              type: 'finish',
              reason: candidate.finishReason
            });
          }
        }
      } catch (error) {
        continue;
      }
    }

    return processed;
  }

  /**
   * Parse Server-Sent Events
   */
  parseSSE(chunk) {
    const events = [];
    const lines = chunk.split('\n');

    let event = { data: '', event: 'message' };

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event.event = line.substring(7);
      } else if (line.startsWith('data: ')) {
        event.data += line.substring(6);
      } else if (line.trim() === '') {
        if (event.data) {
          events.push({ ...event });
          event = { data: '', event: 'message' };
        }
      }
    }

    return events;
  }

  /**
   * Parse NDJSON (Newline Delimited JSON)
   */
  parseNDJSON(chunk) {
    const objects = [];
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        objects.push(JSON.parse(line));
      } catch (error) {
        // Skip invalid JSON
      }
    }

    return objects;
  }

  /**
   * Stop streaming
   */
  stopStream() {
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming() {
    return this.isStreaming;
  }

  /**
   * Clear buffer
   */
  clearBuffer() {
    this.buffer = '';
  }

  /**
   * Get buffer content
   */
  getBuffer() {
    return this.buffer;
  }
}

export default StreamHandler;
