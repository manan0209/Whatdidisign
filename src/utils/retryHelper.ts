export class RetryHelper {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    backoff: boolean = true
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying, with optional exponential backoff
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
        await this.wait(waitTime);
        
        console.log(`WhatDidISign: Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms`);
      }
    }
    
    throw lastError!;
  }

  private static shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors or client errors
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return errorMessage.includes('unauthorized') ||
           errorMessage.includes('forbidden') ||
           errorMessage.includes('invalid api key') ||
           errorMessage.includes('quota exceeded') ||
           (error?.status >= 400 && error?.status < 500);
  }

  private static wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example:
// const result = await RetryHelper.withRetry(() => aiService.analyze(content), 2, 1000);
