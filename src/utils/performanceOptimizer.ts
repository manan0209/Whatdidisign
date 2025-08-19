export class PerformanceOptimizer {
  private static throttledFunctions = new Map<string, any>();

  // Throttle function calls to prevent excessive operations
  static throttle(func: Function, delay: number, key: string): Function {
    if (this.throttledFunctions.has(key)) {
      return this.throttledFunctions.get(key);
    }

    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    const throttledFunc = (...args: any[]) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };

    this.throttledFunctions.set(key, throttledFunc);
    return throttledFunc;
  }

  // Debounce function calls
  static debounce(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Check if browser is busy (high CPU usage)
  static async isBrowserBusy(): Promise<boolean> {
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 100000;
      
      // Simple CPU test
      for (let i = 0; i < iterations; i++) {
        Math.random();
      }
      
      const end = performance.now();
      const executionTime = end - start;
      
      // If it takes too long, browser might be busy
      resolve(executionTime > 50);
    });
  }

  // Batch DOM operations to minimize reflows
  static batchDOMUpdates(operations: Function[]): void {
    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      operations.forEach(operation => {
        try {
          operation();
        } catch (error) {
          console.error('DOM operation failed:', error);
        }
      });
    });
  }

  // Check if element is visible (for performance optimization)
  static isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           rect.top >= 0 && rect.left >= 0 &&
           rect.bottom <= window.innerHeight && 
           rect.right <= window.innerWidth;
  }
}
