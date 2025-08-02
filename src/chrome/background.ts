import { Summary, Settings, CacheEntry, DetectedLink } from '../types';
import { AIService, DEFAULT_PROVIDERS } from '../utils/aiService';

class BackgroundService {
  private cache: Map<string, CacheEntry> = new Map();
  private settings: Settings;
  private readonly CACHE_KEY = 'whatdidisign_cache';
  private readonly SETTINGS_KEY = 'whatdidisign_settings';

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeService();
  }

  async initializeService(): Promise<void> {
    await this.loadCache();
    await this.loadSettings();
    
    // Set up message listener with proper async handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });
    
    this.setupContextMenu();
  }

  private getDefaultSettings(): Settings {
    return {
      enabled: true,
      aiProvider: {
        name: 'Google Gemini',
        apiKey: '',
        model: 'gemini-1.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        costPer1K: 0,
        provider: 'gemini'
      },
      cacheEnabled: true,
      cacheExpiry: 30, // days
      showRedFlags: true,
      riskThreshold: 0.7,
      uiMode: 'popup',
      notifications: true,
      preferredProvider: 'gemini'
    };
  }

  async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<boolean> {
    try {
      switch (message.action) {
        case 'linksDetected':
          await this.handleLinksDetected(message.links, message.url);
          sendResponse({ success: true });
          break;

        case 'summarize':
          const summary = await this.generateSummary(message.url, message.type);
          sendResponse(summary);
          break;

        case 'getSummary':
          const cachedSummary = this.getCachedSummary(message.url);
          sendResponse(cachedSummary);
          break;

        case 'analyzeClicked':
          // Start analysis in background and update badge
          this.handleClickedAnalysis(message.url, message.type, message.text);
          sendResponse({ success: true });
          break;

        case 'getSettings':
          sendResponse(this.settings);
          break;

        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;

        case 'clearCache':
          await this.clearCache();
          sendResponse({ success: true });
          break;

        case 'getCacheStats':
          sendResponse(this.getCacheStats());
          break;

        default:
          sendResponse({ error: 'Unknown action' });
          break;
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    
    return true; // Indicates that the response is sent asynchronously
  }

  private async handleLinksDetected(links: DetectedLink[], pageUrl: string): Promise<void> {
    // Update badge to show number of detected links
    if (links.length > 0) {
      chrome.action.setBadgeText({
        text: links.length.toString(),
        tabId: await this.getCurrentTabId()
      });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    }

    // Check if we have cached summaries for any of these links
    const cachedSummaries = links.filter(link => this.cache.has(link.url));
    
    if (cachedSummaries.length > 0 && this.settings.notifications) {
      this.showNotification(
        `Found ${cachedSummaries.length} cached T&C summaries`,
        'Click to view summaries'
      );
    }
  }

  private async generateSummary(url: string, type: string): Promise<Summary> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && !this.isCacheExpired(cached)) {
      cached.hits++;
      await this.saveCache();
      return cached.summary;
    }

    // Fetch the document
    const content = await this.fetchDocument(url);
    
    // Generate AI summary
    const summary = await this.createAISummary(content, type, url);
    
    // Cache the result
    if (this.settings.cacheEnabled) {
      this.cache.set(url, {
        url,
        summary,
        timestamp: Date.now(),
        hits: 1
      });
      await this.saveCache();
    }

    return summary;
  }

  private getCachedSummary(url: string): { summary?: Summary } | null {
    const cached = this.cache.get(url);
    if (cached && !this.isCacheExpired(cached)) {
      return { summary: cached.summary };
    }
    return null;
  }

  private async handleClickedAnalysis(url: string, type: string, text: string): Promise<void> {
    try {
      // Update badge to show analysis in progress
      chrome.action.setBadgeText({ text: '...' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' });
      
      // Start generating summary in background
      const summary = await this.generateSummary(url, type);
      
      // Update badge to show analysis complete
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
      
      // Show notification about analysis completion
      if (this.settings.notifications) {
        const riskLevel = summary.riskScore > 0.7 ? 'High Risk' : 
                         summary.riskScore > 0.4 ? 'Medium Risk' : 'Low Risk';
        this.showNotification(
          `${text} Analysis Complete`,
          `Risk Level: ${riskLevel} - Click extension to view details`
        );
      }
    } catch (error) {
      console.error('Failed to analyze clicked document:', error);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    }
  }

  private async fetchDocument(url: string): Promise<string> {
    try {
      // Try to get content from an active tab if it's the same URL
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (activeTab?.url === url && activeTab.id) {
        // If we're on the same page, get content from the content script
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id, {
            type: 'GET_PAGE_CONTENT'
          });
          if (response && response.content) {
            return response.content;
          }
        } catch (error) {
          console.log('Could not get content from active tab, falling back to fetch');
        }
      }
      
      // For external URLs, we need to inject a content script to fetch the content
      // This avoids CORS issues and DOMParser problems
      return await this.fetchExternalDocument(url);
      
    } catch (error) {
      throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchExternalDocument(url: string): Promise<string> {
    try {
      // Create a new tab to fetch the content
      const tab = await chrome.tabs.create({ url, active: false });
      
      if (!tab.id) {
        throw new Error('Failed to create tab');
      }
      
      // Wait for the tab to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // Inject content script to extract text
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Remove script and style elements
          const scripts = document.querySelectorAll('script, style, noscript');
          scripts.forEach(el => el.remove());
          
          // Get text content from body
          const bodyText = document.body?.textContent || document.documentElement.textContent || '';
          
          // Clean up whitespace
          return bodyText.replace(/\s+/g, ' ').trim();
        }
      });
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
      
      return results[0]?.result || '';
      
    } catch (error) {
      throw new Error(`Failed to fetch external document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createAISummary(content: string, type: string, url: string): Promise<Summary> {
    if (!this.settings.aiProvider.apiKey) {
      throw new Error('AI provider API key not configured');
    }

    const aiService = new AIService(this.settings.aiProvider);
    return await aiService.summarizeDocument(content, url, type);
  }

  private setupContextMenu(): void {
    try {
      // Check if contextMenus API is available
      if (chrome.contextMenus && chrome.contextMenus.create) {
        chrome.contextMenus.create({
          id: 'whatdidisign-analyze',
          title: 'Analyze with WhatDidISign',
          contexts: ['link']
        });

        chrome.contextMenus.onClicked.addListener(async (info) => {
          if (info.menuItemId === 'whatdidisign-analyze' && info.linkUrl) {
            try {
              const summary = await this.generateSummary(info.linkUrl, 'terms');
              this.showSummaryNotification(summary);
            } catch (error) {
              console.error('Error analyzing link:', error);
            }
          }
        });
      } else {
        console.warn('Context menus API not available');
      }
    } catch (error) {
      console.error('Failed to setup context menu:', error);
    }
  }

  private async getCurrentTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id || 0;
  }

  private showNotification(title: string, message: string): void {
    try {
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title,
          message
        });
      } else {
        console.log('Notification:', title, '-', message);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private showSummaryNotification(summary: Summary): void {
    const riskLevel = summary.riskScore > 0.7 ? 'High' : summary.riskScore > 0.4 ? 'Medium' : 'Low';
    
    try {
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: `${summary.title} - Risk: ${riskLevel}`,
          message: `${summary.keyPoints.length} key points, ${summary.redFlags.length} red flags detected`
        });
      } else {
        console.log('Summary notification:', `${summary.title} - Risk: ${riskLevel}`, 
                   `${summary.keyPoints.length} key points, ${summary.redFlags.length} red flags detected`);
      }
    } catch (error) {
      console.error('Failed to show summary notification:', error);
    }
  }

  private async loadCache(): Promise<void> {
    const result = await chrome.storage.local.get([this.CACHE_KEY]);
    if (result[this.CACHE_KEY]) {
      this.cache = new Map(result[this.CACHE_KEY]);
    }
  }

  private async saveCache(): Promise<void> {
    await chrome.storage.local.set({
      [this.CACHE_KEY]: Array.from(this.cache.entries())
    });
  }

  private async loadSettings(): Promise<void> {
    const result = await chrome.storage.sync.get([this.SETTINGS_KEY]);
    if (result[this.SETTINGS_KEY]) {
      this.settings = { ...this.settings, ...result[this.SETTINGS_KEY] };
    }
  }

  private async updateSettings(newSettings: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.sync.set({
      [this.SETTINGS_KEY]: this.settings
    });
  }

  private async clearCache(): Promise<void> {
    this.cache.clear();
    await chrome.storage.local.remove([this.CACHE_KEY]);
  }

  private getCacheStats(): any {
    return {
      totalEntries: this.cache.size,
      totalHits: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0),
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(entry => entry.timestamp))
    };
  }

  private isCacheExpired(entry: CacheEntry): boolean {
    const expiryTime = entry.timestamp + (this.settings.cacheExpiry * 24 * 60 * 60 * 1000);
    return Date.now() > expiryTime;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Initialize the background service
new BackgroundService();
