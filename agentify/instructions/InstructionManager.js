import { SystemError } from '../errors/ErrorTypes.js';

/**
 * Manages system instructions for the agent
 */
export class InstructionManager {
  constructor(errorManager) {
    this.instruction = '';
    this.instructionParts = [];
    this.errorManager = errorManager;
  }

  /**
   * Set instruction from text
   */
  setFromText(text) {
    if (typeof text !== 'string') {
      throw this.errorManager.createSystemError(
        'Instruction must be a string',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof text }
      );
    }

    this.instruction = text;
    return this.instruction;
  }

  /**
   * Load instruction from file
   */
  async loadFromFile(file) {
    try {
      const content = await this.readFile(file);
      this.instruction = content;
      return this.instruction;
    } catch (error) {
      throw this.errorManager.createSystemError(
        'Failed to load instruction from file',
        SystemError.codes.INIT_FAILED,
        {
          fileName: file.name || 'unknown',
          originalError: error.message
        }
      );
    }
  }

  /**
   * Read file content
   */
  async readFile(file) {
    return new Promise((resolve, reject) => {
      if (file instanceof File) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          resolve(e.target.result);
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
      } else if (typeof file === 'string') {
        // If it's a string, treat it as content
        resolve(file);
      } else {
        reject(new Error('Invalid file format'));
      }
    });
  }

  /**
   * Add instruction part (for composing multiple instructions)
   */
  addInstructionPart(text, key = null) {
    if (typeof text !== 'string') {
      throw this.errorManager.createSystemError(
        'Instruction part must be a string',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof text }
      );
    }

    const part = {
      key: key || `part_${this.instructionParts.length}`,
      content: text,
      timestamp: new Date().toISOString()
    };

    this.instructionParts.push(part);
    this.rebuildInstruction();
    
    return part;
  }

  /**
   * Load instruction part from file
   */
  async addInstructionPartFromFile(file, key = null) {
    try {
      const content = await this.readFile(file);
      return this.addInstructionPart(content, key);
    } catch (error) {
      throw this.errorManager.createSystemError(
        'Failed to load instruction part from file',
        SystemError.codes.INIT_FAILED,
        {
          fileName: file.name || 'unknown',
          originalError: error.message
        }
      );
    }
  }

  /**
   * Remove instruction part by key
   */
  removeInstructionPart(key) {
    const index = this.instructionParts.findIndex(part => part.key === key);
    
    if (index === -1) {
      return false;
    }

    this.instructionParts.splice(index, 1);
    this.rebuildInstruction();
    
    return true;
  }

  /**
   * Rebuild full instruction from parts
   */
  rebuildInstruction() {
    if (this.instructionParts.length === 0) {
      return;
    }

    this.instruction = this.instructionParts
      .map(part => part.content)
      .join('\n\n');
  }

  /**
   * Merge multiple instructions
   */
  merge(instructions) {
    if (!Array.isArray(instructions)) {
      throw this.errorManager.createSystemError(
        'Instructions must be an array',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof instructions }
      );
    }

    const merged = instructions
      .filter(inst => typeof inst === 'string' && inst.trim().length > 0)
      .join('\n\n');

    this.instruction = merged;
    return this.instruction;
  }

  /**
   * Render instruction with variable substitution
   */
  render(variables = {}) {
    if (!variables || typeof variables !== 'object') {
      return this.instruction;
    }

    let rendered = this.instruction;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Get current instruction
   */
  getInstruction() {
    return this.instruction;
  }

  /**
   * Get instruction parts
   */
  getInstructionParts() {
    return [...this.instructionParts];
  }

  /**
   * Clear all instructions
   */
  clear() {
    this.instruction = '';
    this.instructionParts = [];
  }

  /**
   * Check if instruction is set
   */
  hasInstruction() {
    return this.instruction.trim().length > 0;
  }

  /**
   * Get instruction length
   */
  getLength() {
    return this.instruction.length;
  }

  /**
   * Prepend text to instruction
   */
  prepend(text) {
    if (typeof text !== 'string') {
      throw this.errorManager.createSystemError(
        'Text must be a string',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof text }
      );
    }

    this.instruction = text + '\n\n' + this.instruction;
    return this.instruction;
  }

  /**
   * Append text to instruction
   */
  append(text) {
    if (typeof text !== 'string') {
      throw this.errorManager.createSystemError(
        'Text must be a string',
        SystemError.codes.INVALID_PARAMETER,
        { providedType: typeof text }
      );
    }

    this.instruction = this.instruction + '\n\n' + text;
    return this.instruction;
  }
}

export default InstructionManager;
