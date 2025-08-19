import { DetectedLink } from '../types';
import { PerformanceOptimizer } from '../utils/performanceOptimizer';
import { ErrorHandler } from '../utils/errorHandler';

class TCDetector {
  private static readonly KEYWORDS = {
    terms: [
      'terms of service', 'terms of use', 'terms & conditions', 'terms and conditions',
      'user agreement', 'service agreement', 'legal terms', 'tos', 'eula',
      'end user license agreement', 'licensing agreement', 'terms', 'conditions',
      'user terms', 'service terms', 'website terms', 'platform terms'
    ],
    privacy: [
      'privacy policy', 'privacy notice', 'privacy statement', 'data policy',
      'data protection', 'privacy practices', 'information collection', 'privacy',
      'data usage', 'personal information', 'data handling', 'privacy rights'
    ],
    cookies: [
      'cookie policy', 'cookie notice', 'cookie preferences', 'cookie settings',
      'cookies and tracking', 'cookie information', 'cookies', 'tracking'
    ]
  };

  private static readonly SELECTORS = [
    'a[href*="terms"]',
    'a[href*="privacy"]',
    'a[href*="legal"]',
    'a[href*="policy"]',
    'a[href*="agreement"]',
    'a[href*="cookies"]',
    'a[href*="eula"]',
    'a[href*="tos"]'
  ];

  private observer: MutationObserver;
  private detectedLinks: DetectedLink[] = [];
  private isInitialized = false;
  private currentTooltip: HTMLElement | null = null;
  private currentAnalysisPopup: HTMLElement | null = null;
  private throttledScanForLinks: Function;

  constructor() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.setupMessageListener();
    
    // Create throttled version of scanForLinks for performance
    this.throttledScanForLinks = PerformanceOptimizer.throttle(
      this.scanForLinks.bind(this), 
      1000, 
      'scanForLinks'
    );
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_CONTENT') {
        // Extract clean text content from the current page
        const content = this.extractPageContent();
        sendResponse({ content });
        return true; // Keep message channel open for async response
      }
    });
  }

  private extractPageContent(): string {
    // Clone the document to avoid modifying the original
    const docClone = document.cloneNode(true) as Document;
    
    // Remove script and style elements
    const scripts = docClone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    // Get text content from body
    const bodyText = docClone.body?.textContent || docClone.documentElement.textContent || '';
    
    // Clean up whitespace
    return bodyText.replace(/\s+/g, ' ').trim();
  }

  init(): void {
    if (this.isInitialized) {
      return;
    }
    
    console.log('WhatDidISign: Content script initializing...');
    this.isInitialized = true;
    
    // Use requestIdleCallback for non-urgent operations
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.scanForLinks();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.scanForLinks(), 100);
    }
    
    // Delayed scan for dynamic content with better timing
    setTimeout(() => {
      console.log('WhatDidISign: Performing delayed scan for dynamic content...');
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => this.scanForLinks());
      } else {
        this.scanForLinks();
      }
    }, 2000);
    
    // Start observing DOM changes with throttling
    this.startObserving();
    this.notifyBackground();
    console.log('WhatDidISign: Content script initialized');
  }

  private scanForLinks(): void {
    const links = document.querySelectorAll('a[href]');
    const newLinks: DetectedLink[] = [];
    
    console.log(`WhatDidISign: Scanning ${links.length} links on page`);

    // First pass - analyze all links
    links.forEach(link => {
      const detected = this.analyzeLink(link as HTMLAnchorElement);
      if (detected && !this.isDuplicate(detected)) {
        newLinks.push(detected);
        this.addVisualIndicator(detected);
        console.log(`WhatDidISign: Detected ${detected.type} link:`, detected.text, detected.url);
      }
    });

    // Second pass - check footer and common locations if no links found
    if (newLinks.length === 0) {
      const footerLinks = this.scanFooterLinks();
      newLinks.push(...footerLinks);
    }

    this.detectedLinks.push(...newLinks);
    
    console.log(`WhatDidISign: Found ${newLinks.length} new T&C links, total: ${this.detectedLinks.length}`);
    
    if (newLinks.length > 0) {
      this.notifyBackground();
    }
  }

  private scanFooterLinks(): DetectedLink[] {
    const footerLinks: DetectedLink[] = [];
    
    // Look for common footer selectors
    const footerSelectors = [
      'footer', 'div[class*="footer"]', 'div[id*="footer"]',
      'nav[class*="footer"]', 'div[class*="legal"]', 'div[class*="bottom"]',
      // Google-specific selectors
      'div[jsname]', 'div[data-ved]', 'div[style*="bottom"]'
    ];
    
    // Also try to find links anywhere in the bottom part of the page
    const bottomLinks = document.querySelectorAll('a[href]');
    const pageHeight = document.documentElement.scrollHeight;
    const bottomThreshold = pageHeight * 0.8; // Bottom 20% of page
    
    console.log(`WhatDidISign: Scanning footer areas and bottom ${Math.round((1 - 0.8) * 100)}% of page`);
    
    footerSelectors.forEach(selector => {
      const footerElement = document.querySelector(selector);
      if (footerElement) {
        console.log(`WhatDidISign: Found footer element with selector: ${selector}`);
        const links = footerElement.querySelectorAll('a[href]');
        links.forEach(link => {
          const detected = this.analyzeLink(link as HTMLAnchorElement);
          if (detected && !this.isDuplicate(detected) && 
              !footerLinks.some(existing => existing.url === detected.url)) {
            footerLinks.push(detected);
            this.addVisualIndicator(detected);
            console.log(`WhatDidISign: Found ${detected.type} link in footer:`, detected.text);
          }
        });
      }
    });
    
    // Check bottom area links
    bottomLinks.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      const rect = linkElement.getBoundingClientRect();
      const absoluteTop = rect.top + window.pageYOffset;
      
      if (absoluteTop > bottomThreshold) {
        const detected = this.analyzeLink(linkElement);
        if (detected && !this.isDuplicate(detected) && 
            !footerLinks.some(existing => existing.url === detected.url)) {
          footerLinks.push(detected);
          this.addVisualIndicator(detected);
          console.log(`WhatDidISign: Found ${detected.type} link in bottom area:`, detected.text);
        }
      }
    });
    
    return footerLinks;
  }

  private getUrlBonus(href: string): { score: number; type: string } {
    // Check URL patterns for common legal document paths
    const patterns = {
      terms: [
        '/terms', '/tos', '/user-agreement', '/eula', '/service-agreement',
        'terms-of-service', 'terms-of-use', 'terms-and-conditions'
      ],
      privacy: [
        '/privacy', '/privacy-policy', '/data-policy', '/privacy-notice',
        'privacy-statement', 'privacy-practices'
      ],
      cookies: [
        '/cookies', '/cookie-policy', '/cookie-notice', '/cookie-preferences'
      ]
    };

    for (const [type, typePatterns] of Object.entries(patterns)) {
      for (const pattern of typePatterns) {
        if (href.includes(pattern)) {
          return { score: 0.5, type }; // High bonus for URL match
        }
      }
    }

    return { score: 0, type: '' };
  }

  private analyzeLink(link: HTMLAnchorElement): DetectedLink | null {
    const href = link.href.toLowerCase();
    const text = link.textContent?.toLowerCase() || '';
    const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() || '';
    const title = link.title?.toLowerCase() || '';
    
    const combinedText = `${text} ${ariaLabel} ${title} ${href}`;
    
    // Check for different types of legal documents
    const typeScores = {
      terms: this.calculateScore(combinedText, TCDetector.KEYWORDS.terms),
      privacy: this.calculateScore(combinedText, TCDetector.KEYWORDS.privacy),
      cookies: this.calculateScore(combinedText, TCDetector.KEYWORDS.cookies)
    };

    // Additional check for URL patterns
    const urlBonus = this.getUrlBonus(href);
    if (urlBonus.score > 0) {
      typeScores[urlBonus.type as keyof typeof typeScores] += urlBonus.score;
    }

    // Find the highest scoring type
    const bestType = Object.entries(typeScores).reduce((a, b) => 
      typeScores[a[0] as keyof typeof typeScores] > typeScores[b[0] as keyof typeof typeScores] ? a : b
    );

    const confidence = typeScores[bestType[0] as keyof typeof typeScores];
    
    // Debug logging
    if (confidence > 0.05 || text.includes('terms') || text.includes('privacy')) {
      console.log(`WhatDidISign: Link analysis for "${text.substring(0, 50)}...":`, {
        confidence,
        type: bestType[0],
        scores: typeScores,
        href: href.substring(0, 100),
        text: text,
        urlBonus: urlBonus
      });
    }
    
    if (confidence > 0.1) { // Further lowered threshold
      return {
        url: link.href,
        text: link.textContent || '',
        type: bestType[0] as 'terms' | 'privacy' | 'cookies',
        element: link,
        confidence
      };
    }

    return null;
  }

  private calculateScore(text: string, keywords: string[]): number {
    let score = 0;
    let maxScore = 0;

    keywords.forEach(keyword => {
      maxScore += keyword.length;
      if (text.includes(keyword)) {
        score += keyword.length;
        // Bonus for exact matches
        if (text.split(' ').some(word => word === keyword)) {
          score += keyword.length * 0.5;
        }
      }
    });

    return maxScore > 0 ? score / maxScore : 0;
  }

  private isDuplicate(link: DetectedLink): boolean {
    return this.detectedLinks.some(existing => 
      existing.url === link.url || 
      (existing.text === link.text && existing.type === link.type)
    );
  }

  private addVisualIndicator(link: DetectedLink): void {
    const indicator = document.createElement('div');
    indicator.className = 'whatdidisign-indicator';
    indicator.setAttribute('data-url', link.url);
    indicator.setAttribute('data-type', link.type);

    // Make parent element relatively positioned
    const parent = link.element.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(indicator);
      console.log('WhatDidISign: Added indicator for', link.type, 'link:', link.text);
    }

    // Add hover handlers for tooltip (only if no analysis popup is open)
    indicator.addEventListener('mouseenter', (e) => {
      if (!this.currentAnalysisPopup) {
        console.log('WhatDidISign: Mouse entered indicator for', link.type);
        this.showTooltip(indicator, link);
      }
    });

    indicator.addEventListener('mouseleave', (e) => {
      if (!this.currentAnalysisPopup) {
        console.log('WhatDidISign: Mouse left indicator');
        this.hideTooltip();
      }
    });

    // Add click handler for full analysis popup
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('WhatDidISign: Indicator clicked for', link.type);
      this.handleIndicatorClick(link);
    });
  }

  private handleIndicatorClick(link: DetectedLink): void {
    console.log('WhatDidISign: Indicator clicked for', link.type);
    
    // Remove any existing tooltip and show full analysis popup
    this.hideTooltip();
    this.showFullAnalysisPopup(link);
  }

  private showFullAnalysisPopup(link: DetectedLink): void {
    // Remove any existing analysis popup
    this.hideFullAnalysisPopup();

    const popup = document.createElement('div');
    popup.className = 'whatdidisign-analysis-popup';
    popup.innerHTML = `
      <div class="analysis-header">
        <div class="analysis-title">
          <span class="doc-type">${link.type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</span>
          <button class="close-btn" type="button">×</button>
        </div>
        <div class="analysis-url">${new URL(link.url).hostname}</div>
      </div>
      <div class="analysis-content">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing document with AI...</div>
        </div>
      </div>
    `;

    // Position popup optimally
    document.body.appendChild(popup);
    this.positionAnalysisPopup(popup);

    // Add close button functionality
    const closeBtn = popup.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => {
      this.hideFullAnalysisPopup();
    });

    // Click outside to close
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        this.hideFullAnalysisPopup();
      }
    });

    // Start analysis
    this.performAnalysis(link, popup);

    // Store reference
    this.currentAnalysisPopup = popup;

    // Show with animation
    setTimeout(() => {
      popup.classList.add('show');
    }, 50);
  }

  private positionAnalysisPopup(popup: HTMLElement): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = 480;
    const popupHeight = 600;

    // Center the popup in viewport
    let leftPos = (viewportWidth - popupWidth) / 2;
    let topPos = (viewportHeight - popupHeight) / 2;

    // Ensure popup stays within viewport bounds
    leftPos = Math.max(20, Math.min(leftPos, viewportWidth - popupWidth - 20));
    topPos = Math.max(20, Math.min(topPos, viewportHeight - popupHeight - 20));

    popup.style.left = `${leftPos}px`;
    popup.style.top = `${topPos}px`;
    popup.style.width = `${popupWidth}px`;
    popup.style.maxHeight = `${Math.min(popupHeight, viewportHeight - 40)}px`;
  }

  private async performAnalysis(link: DetectedLink, popup: HTMLElement): Promise<void> {
    try {
      const summary = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'summarize',
          url: link.url,
          type: link.type
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      this.displayAnalysisResults(popup, summary);
    } catch (error) {
      console.error('Analysis failed:', error);
      this.displayAnalysisError(popup, (error as Error).message || 'Analysis failed');
    }
  }

  private displayAnalysisResults(popup: HTMLElement, summary: any): void {
    const contentEl = popup.querySelector('.analysis-content');
    if (!contentEl) return;

    const riskLevel = summary.riskScore > 0.7 ? 'high' : summary.riskScore > 0.4 ? 'medium' : 'low';
    const riskPercent = Math.round(summary.riskScore * 100);
    const safetyAdvice = this.getSafetyAdvice(summary.riskScore);

    contentEl.innerHTML = `
      <div class="risk-assessment">
        <div class="risk-score risk-${riskLevel}">
          <div class="risk-number">${riskPercent}</div>
          <div class="risk-label">Risk Score</div>
        </div>
        <div class="safety-advice">
          <div class="advice-label">Recommendation</div>
          <div class="advice-text">${safetyAdvice}</div>
        </div>
      </div>

      ${summary.redFlags && summary.redFlags.length > 0 ? `
        <div class="section warnings">
          <h3>Major Warnings</h3>
          <div class="warning-list">
            ${summary.redFlags.slice(0, 3).map((flag: any) => `
              <div class="warning-item severity-${flag.severity || 'medium'}">
                <div class="warning-text">${flag.description}</div>
                ${flag.quote ? `<div class="warning-quote">"${flag.quote.substring(0, 100)}..."</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section key-points">
        <h3>Key Points</h3>
        <div class="points-list">
          ${(summary.keyPoints || []).slice(0, 4).map((point: any) => `
            <div class="point-item">${point}</div>
          `).join('')}
        </div>
      </div>

      ${summary.dataRights && summary.dataRights.length > 0 ? `
        <div class="section data-rights">
          <h3>Your Data Rights</h3>
          <div class="rights-list">
            ${summary.dataRights.slice(0, 3).map((right: any) => `
              <div class="right-item ${right.available ? 'available' : 'unavailable'}">
                <span class="right-name">${this.formatRightType(right.type)}</span>
                <span class="right-status">${right.available ? 'Available' : 'Not Available'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="action-buttons">
        <button class="btn-secondary" onclick="window.open('${summary.url}', '_blank')">View Full Document</button>
        <button class="btn-primary" onclick="this.closest('.whatdidisign-analysis-popup').remove()">Got It</button>
      </div>
    `;
  }

  private getSafetyAdvice(riskScore: number): string {
    if (riskScore > 0.7) {
      return "Review carefully before accepting. Consider alternatives.";
    } else if (riskScore > 0.4) {
      return "Proceed with caution. Check the warnings below.";
    } else {
      return "Generally safe to accept with standard terms.";
    }
  }

  private formatRightType(type: string): string {
    const typeMap: Record<string, string> = {
      'access': 'Data Access',
      'deletion': 'Data Deletion',
      'portability': 'Data Export',
      'correction': 'Data Correction',
      'opt-out': 'Opt-out Rights'
    };
    return typeMap[type] || type;
  }

  private displayAnalysisError(popup: HTMLElement, errorMessage: string): void {
    const contentEl = popup.querySelector('.analysis-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="error-state">
        <div class="error-icon">!</div>
        <div class="error-title">Analysis Failed</div>
        <div class="error-message">${errorMessage}</div>
        <div class="error-actions">
          <button class="btn-secondary" onclick="window.open('${contentEl.closest('[data-url]')?.getAttribute('data-url')}', '_blank')">View Document Manually</button>
          <button class="btn-primary" onclick="this.closest('.whatdidisign-analysis-popup').remove()">Close</button>
        </div>
      </div>
    `;
  }

  private hideFullAnalysisPopup(): void {
    if (this.currentAnalysisPopup) {
      this.currentAnalysisPopup.classList.remove('show');
      setTimeout(() => {
        if (this.currentAnalysisPopup) {
          this.currentAnalysisPopup.remove();
          this.currentAnalysisPopup = null;
        }
      }, 300);
    }
  }

  private showTooltip(indicator: HTMLElement, link: DetectedLink): void {
    // Remove any existing tooltip
    this.hideTooltip();

    console.log('WhatDidISign: Creating tooltip for', link.type, 'link');

    const tooltip = document.createElement('div');
    tooltip.className = 'whatdidisign-tooltip';
    tooltip.innerHTML = `
      <div class="whatdidisign-tooltip-header">
        <span class="whatdidisign-tooltip-title">${link.type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</span>
      </div>
      <div class="whatdidisign-tooltip-content">
        <div class="summary-text">Found ${link.type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'} document</div>
        <div class="whatdidisign-tooltip-actions">
          <span style="font-size: 11px; color: #888;">Click dot to analyze with AI</span>
        </div>
      </div>
    `;

    // Position tooltip relative to indicator
    document.body.appendChild(tooltip);
    
    const indicatorRect = indicator.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 300; // approximate tooltip width
    const tooltipHeight = 120; // approximate tooltip height
    
    // Position above the dot by default
    let leftPos = indicatorRect.left + (indicatorRect.width / 2) - (tooltipWidth / 2);
    let topPos = indicatorRect.top - tooltipHeight - 10; // 10px gap above the dot
    let isBelow = false;
    
    // Adjust horizontal positioning to keep tooltip on screen
    if (leftPos < 10) leftPos = 10;
    if (leftPos + tooltipWidth > viewportWidth - 10) leftPos = viewportWidth - tooltipWidth - 10;
    
    // If tooltip would go above viewport, position it below the dot instead
    if (topPos < 10) {
      topPos = indicatorRect.bottom + 10;
      isBelow = true;
    }
    
    // If positioning below would go off bottom of screen, try to fit it in viewport
    if (topPos + tooltipHeight > viewportHeight - 10) {
      topPos = Math.max(10, viewportHeight - tooltipHeight - 10);
    }
    
    tooltip.style.left = `${leftPos}px`;
    tooltip.style.top = `${topPos}px`;
    
    // Add 'below' class if tooltip is positioned below the dot
    if (isBelow) {
      tooltip.classList.add('below');
    }

    console.log('WhatDidISign: Tooltip positioned at', tooltip.style.left, tooltip.style.top, 'isBelow:', isBelow);

    // Add the show class to make it visible
    setTimeout(() => {
      tooltip.classList.add('show');
    }, 50);

    // Try to get cached summary (optional enhancement)
    try {
      chrome.runtime.sendMessage({
        action: 'getSummary',
        url: link.url,
        type: link.type
      }, (response) => {
        console.log('WhatDidISign: Got summary response:', response);
        const contentEl = tooltip.querySelector('.whatdidisign-tooltip-content');
        if (contentEl && response && response.summary) {
          // Create a simplified summary for the tooltip
          const summary = response.summary;
          let shortSummary = '';
          
          if (typeof summary === 'string') {
            shortSummary = summary.substring(0, 150) + '...';
          } else if (summary.keyPoints && summary.keyPoints.length > 0) {
            shortSummary = summary.keyPoints[0].substring(0, 150) + '...';
          } else {
            shortSummary = 'AI summary available';
          }
          
          contentEl.innerHTML = `
            <div class="summary-text">${shortSummary}</div>
            <div class="whatdidisign-tooltip-actions">
              <span style="font-size: 11px; color: #888;">Click dot for full analysis</span>
            </div>
          `;
        }
      });
    } catch (error) {
      console.log('WhatDidISign: Could not fetch summary:', error);
    }

    // Store reference for cleanup
    this.currentTooltip = tooltip;
  }

  private hideTooltip(): void {
    if (this.currentTooltip) {
      this.currentTooltip.classList.remove('show');
      setTimeout(() => {
        if (this.currentTooltip) {
          this.currentTooltip.remove();
          this.currentTooltip = null;
        }
      }, 300); // Wait for transition to complete
    }
  }

  private startObserving(): void {
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private handleMutations(mutations: MutationRecord[]): void {
    let shouldScan = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'A' || element.querySelector('a')) {
              shouldScan = true;
            }
          }
        });
      }
    });

    if (shouldScan) {
      // Use throttled version to prevent excessive scanning
      this.throttledScanForLinks();
    }
  }

  private notifyBackground(): void {
    chrome.runtime.sendMessage({
      action: 'linksDetected',
      links: this.detectedLinks,
      url: window.location.href
    });
  }

  getDetectedLinks(): DetectedLink[] {
    return this.detectedLinks;
  }

  destroy(): void {
    this.observer.disconnect();
    this.isInitialized = false;
    // Remove indicators
    document.querySelectorAll('.whatdidisign-indicator').forEach(el => el.remove());
  }
}

// Initialize the detector
const detector = new TCDetector();

// Start detection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => detector.init());
} else {
  detector.init();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getLinks':
      sendResponse(detector.getDetectedLinks());
      break;
    case 'rescan':
      detector.destroy();
      setTimeout(() => detector.init(), 100);
      break;
  }
});

export default detector;
