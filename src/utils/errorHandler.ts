export class ErrorHandler {
  static handleAIError(error: Error): string {
    if (error.message.includes('429')) {
      return 'Our AI is busy right now. Please try again in a moment.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Connection issue. Please check your internet and try again.';
    }
    if (error.message.includes('API key')) {
      return 'AI service temporarily unavailable. The extension will work again shortly.';
    }
    return 'Unable to analyze this document right now. Please try again later.';
  }

  static handleContentError(error: Error): string {
    if (error.message.includes('blocked')) {
      return 'This page blocks analysis. Try opening the document in a new tab.';
    }
    return 'Could not read the document. It may be protected or corrupted.';
  }

  static showUserFriendlyError(message: string): void {
    console.log('WhatDidISign:', message);
    // Could integrate with notification system
  }
}
