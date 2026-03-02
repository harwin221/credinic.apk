/**
 * Rate limiter simple para controlar el número de consultas concurrentes
 */

class RateLimiter {
  private activeQueries = 0;
  private maxConcurrent: number;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeQuery = async () => {
        this.activeQueries++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeQueries--;
          this.processQueue();
        }
      };

      if (this.activeQueries < this.maxConcurrent) {
        executeQuery();
      } else {
        this.queue.push(executeQuery);
      }
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeQueries < this.maxConcurrent) {
      const nextQuery = this.queue.shift();
      if (nextQuery) {
        nextQuery();
      }
    }
  }

  getStats() {
    return {
      activeQueries: this.activeQueries,
      queuedQueries: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }
}

// Instancia global del rate limiter
export const queryLimiter = new RateLimiter(3);