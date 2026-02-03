/**
 * Tracks and manages the agent's thinking status in real-time
 */
export class ThinkingTracker {
  constructor() {
    this.status = {
      isThinking: false,
      currentAction: null,
      step: null,
      progress: 0,
      thinkingContent: '',
      history: [],
      startTime: null,
      elapsedTime: 0
    };
    
    this.listeners = [];
    this.updateInterval = null;
  }

  /**
   * Update thinking status
   */
  updateStatus(action, details = {}) {
    const previousStatus = { ...this.status };
    
    this.status = {
      ...this.status,
      currentAction: action,
      ...details,
      lastUpdate: new Date().toISOString()
    };

    // Calculate elapsed time if thinking started
    if (this.status.isThinking && this.status.startTime) {
      this.status.elapsedTime = Date.now() - new Date(this.status.startTime).getTime();
    }

    // Add to history if action changed
    if (previousStatus.currentAction !== action && action) {
      this.status.history.push({
        action,
        timestamp: new Date().toISOString(),
        details
      });

      // Keep history size manageable
      if (this.status.history.length > 100) {
        this.status.history.shift();
      }
    }

    this.notifyListeners();
  }

  /**
   * Start thinking
   */
  startThinking(action = 'Processing') {
    this.updateStatus(action, {
      isThinking: true,
      startTime: new Date().toISOString(),
      progress: 0
    });

    // Start elapsed time counter
    this.startElapsedTimeCounter();
  }

  /**
   * Stop thinking
   */
  stopThinking() {
    this.updateStatus(null, {
      isThinking: false,
      progress: 100
    });

    this.stopElapsedTimeCounter();
  }

  /**
   * Update current action
   */
  setAction(action, step = null) {
    this.updateStatus(action, { step });
  }

  /**
   * Update progress (0-100)
   */
  setProgress(progress) {
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;
    
    this.updateStatus(this.status.currentAction, { progress });
  }

  /**
   * Add thinking content
   */
  addThinkingContent(content) {
    this.status.thinkingContent += content;
    this.notifyListeners();
  }

  /**
   * Clear thinking content
   */
  clearThinkingContent() {
    this.status.thinkingContent = '';
    this.notifyListeners();
  }

  /**
   * Set step information
   */
  setStep(step, totalSteps = null) {
    const stepInfo = totalSteps ? `${step}/${totalSteps}` : step;
    this.updateStatus(this.status.currentAction, { step: stepInfo });

    // Auto-calculate progress if total steps provided
    if (totalSteps) {
      const progress = Math.round((step / totalSteps) * 100);
      this.setProgress(progress);
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners() {
    const statusCopy = this.getStatus();
    
    for (const listener of this.listeners) {
      try {
        listener(statusCopy);
      } catch (error) {
        console.error('Error in thinking status listener:', error);
      }
    }
  }

  /**
   * Get current status (deep copy)
   */
  getStatus() {
    return JSON.parse(JSON.stringify(this.status));
  }

  /**
   * Get history
   */
  getHistory() {
    return [...this.status.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.status.history = [];
    this.notifyListeners();
  }

  /**
   * Reset status to initial state
   */
  reset() {
    this.stopElapsedTimeCounter();
    
    this.status = {
      isThinking: false,
      currentAction: null,
      step: null,
      progress: 0,
      thinkingContent: '',
      history: [],
      startTime: null,
      elapsedTime: 0
    };

    this.notifyListeners();
  }

  /**
   * Start elapsed time counter
   */
  startElapsedTimeCounter() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.status.isThinking && this.status.startTime) {
        this.status.elapsedTime = Date.now() - new Date(this.status.startTime).getTime();
        this.notifyListeners();
      }
    }, 100); // Update every 100ms
  }

  /**
   * Stop elapsed time counter
   */
  stopElapsedTimeCounter() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get formatted elapsed time
   */
  getFormattedElapsedTime() {
    const ms = this.status.elapsedTime;
    
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Check if currently thinking
   */
  isCurrentlyThinking() {
    return this.status.isThinking;
  }

  /**
   * Get current action
   */
  getCurrentAction() {
    return this.status.currentAction;
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    return this.status.progress;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners = [];
  }

  /**
   * Get listener count
   */
  getListenerCount() {
    return this.listeners.length;
  }

  /**
   * Export status summary
   */
  exportSummary() {
    return {
      currentStatus: this.getStatus(),
      formattedElapsedTime: this.getFormattedElapsedTime(),
      historyCount: this.status.history.length,
      listenerCount: this.listeners.length
    };
  }
}

export default ThinkingTracker;
