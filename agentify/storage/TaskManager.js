import { StorageError } from '../errors/ErrorTypes.js';
import { formatBytes, formatRelativeTime } from '../utils/formatters.js';

/**
 * Manages task persistence using browser localStorage
 */
export class TaskManager {
  constructor(storageKey = 'agentify_tasks', errorManager) {
    this.storageKey = storageKey;
    this.errorManager = errorManager;
    this.maxTasks = 1000;
    this.compressionThreshold = 500;
    
    this.ensureStorageAvailable();
  }

  /**
   * Ensure localStorage is available
   */
  ensureStorageAvailable() {
    try {
      const test = '__agentify_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch (error) {
      throw this.errorManager.createStorageError(
        'localStorage is not available',
        StorageError.codes.NOT_AVAILABLE,
        { originalError: error.message }
      );
    }
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a new task
   */
  addTask(task) {
    try {
      const taskId = task.id || this.generateTaskId();
      
      const taskData = {
        id: taskId,
        type: task.type || 'chat',
        status: task.status || 'pending',
        input: task.input || null,
        output: task.output || null,
        error: task.error || null,
        timestamp: task.timestamp || new Date().toISOString(),
        duration: task.duration || null,
        metadata: task.metadata || {}
      };

      const tasks = this.getTasks();
      tasks.push(taskData);

      // Trim if exceeds max
      if (tasks.length > this.maxTasks) {
        tasks.splice(0, tasks.length - this.maxTasks);
      }

      this.saveTasks(tasks);
      
      return taskData;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw this.errorManager.createStorageError(
        'Failed to add task',
        StorageError.codes.WRITE_FAILED,
        { task, originalError: error.message }
      );
    }
  }

  /**
   * Update task status and data
   */
  updateTaskStatus(taskId, status, data = {}) {
    try {
      const tasks = this.getTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        throw this.errorManager.createStorageError(
          `Task not found: ${taskId}`,
          StorageError.codes.READ_FAILED,
          { taskId }
        );
      }

      tasks[taskIndex] = {
        ...tasks[taskIndex],
        status,
        ...data,
        updatedAt: new Date().toISOString()
      };

      this.saveTasks(tasks);
      
      return tasks[taskIndex];
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw this.errorManager.createStorageError(
        'Failed to update task status',
        StorageError.codes.WRITE_FAILED,
        { taskId, status, originalError: error.message }
      );
    }
  }

  /**
   * Get tasks with optional filtering
   */
  getTasks(filter = {}) {
    try {
      const tasksJson = localStorage.getItem(this.storageKey);
      
      if (!tasksJson) {
        return [];
      }

      let tasks = JSON.parse(tasksJson);

      // Apply filters
      if (filter.status) {
        tasks = tasks.filter(t => t.status === filter.status);
      }

      if (filter.type) {
        tasks = tasks.filter(t => t.type === filter.type);
      }

      if (filter.since) {
        const sinceDate = new Date(filter.since);
        tasks = tasks.filter(t => new Date(t.timestamp) >= sinceDate);
      }

      if (filter.limit) {
        tasks = tasks.slice(-filter.limit);
      }

      return tasks;
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to read tasks',
        StorageError.codes.READ_FAILED,
        { filter, originalError: error.message }
      );
    }
  }

  /**
   * Get single task by ID
   */
  getTask(taskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      throw this.errorManager.createStorageError(
        `Task not found: ${taskId}`,
        StorageError.codes.READ_FAILED,
        { taskId }
      );
    }

    return task;
  }

  /**
   * Save tasks to localStorage
   */
  saveTasks(tasks) {
    try {
      const tasksJson = JSON.stringify(tasks);
      localStorage.setItem(this.storageKey, tasksJson);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Try to compress old tasks
        this.compressOldTasks(tasks);
        
        try {
          const tasksJson = JSON.stringify(tasks);
          localStorage.setItem(this.storageKey, tasksJson);
        } catch {
          throw this.errorManager.createStorageError(
            'Storage quota exceeded even after compression',
            StorageError.codes.QUOTA_EXCEEDED,
            {
              taskCount: tasks.length,
              storageUsed: this.getStorageUsage()
            }
          );
        }
      } else {
        throw this.errorManager.createStorageError(
          'Failed to save tasks',
          StorageError.codes.WRITE_FAILED,
          { originalError: error.message }
        );
      }
    }
  }

  /**
   * Compress old tasks to save space
   */
  compressOldTasks(tasks) {
    if (tasks.length <= this.compressionThreshold) {
      return;
    }

    const keepCount = Math.floor(this.compressionThreshold / 2);
    const oldTasks = tasks.slice(0, tasks.length - keepCount);

    // Remove output/input from old tasks
    oldTasks.forEach(task => {
      if (task.output && typeof task.output === 'string') {
        task.output = task.output.substring(0, 100) + '... [compressed]';
      }
      if (task.input && typeof task.input === 'string') {
        task.input = task.input.substring(0, 100) + '... [compressed]';
      }
    });

    tasks.splice(0, oldTasks.length, ...oldTasks);
  }

  /**
   * Export tasks in specified format
   */
  exportTasks(format = 'json') {
    const tasks = this.getTasks();

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(tasks, null, 2);
      
      case 'csv':
        return this.tasksToCSV(tasks);
      
      case 'text':
        return this.tasksToText(tasks);
      
      default:
        return JSON.stringify(tasks);
    }
  }

  /**
   * Convert tasks to CSV format
   */
  tasksToCSV(tasks) {
    if (tasks.length === 0) {
      return 'id,type,status,timestamp,duration';
    }

    const headers = 'id,type,status,timestamp,duration';
    const rows = tasks.map(task => {
      return [
        task.id,
        task.type,
        task.status,
        task.timestamp,
        task.duration || ''
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Convert tasks to text format
   */
  tasksToText(tasks) {
    return tasks.map(task => {
      return `
Task: ${task.id}
Type: ${task.type}
Status: ${task.status}
Time: ${task.timestamp} (${formatRelativeTime(task.timestamp)})
Duration: ${task.duration ? task.duration + 'ms' : 'N/A'}
${task.error ? `Error: ${JSON.stringify(task.error)}` : ''}
${'='.repeat(60)}
      `.trim();
    }).join('\n\n');
  }

  /**
   * Clear all tasks
   */
  clearTasks() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      throw this.errorManager.createStorageError(
        'Failed to clear tasks',
        StorageError.codes.WRITE_FAILED,
        { originalError: error.message }
      );
    }
  }

  /**
   * Delete specific task
   */
  deleteTask(taskId) {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (tasks.length === filteredTasks.length) {
      return false; // Task not found
    }

    this.saveTasks(filteredTasks);
    return true;
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const tasks = this.getTasks();
    const tasksJson = JSON.stringify(tasks);
    
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const typeCounts = tasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTasks: tasks.length,
      storageUsed: tasksJson.length,
      storageUsedFormatted: formatBytes(tasksJson.length),
      statusCounts,
      typeCounts,
      oldestTask: tasks.length > 0 ? tasks[0].timestamp : null,
      newestTask: tasks.length > 0 ? tasks[tasks.length - 1].timestamp : null
    };
  }

  /**
   * Get storage usage
   */
  getStorageUsage() {
    const tasksJson = localStorage.getItem(this.storageKey) || '';
    return {
      bytes: tasksJson.length,
      formatted: formatBytes(tasksJson.length)
    };
  }

  /**
   * Get task count
   */
  getTaskCount() {
    return this.getTasks().length;
  }
}

export default TaskManager;
