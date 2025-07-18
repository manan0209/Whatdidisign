import { DetectedLink } from '../types';

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

  constructor() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.setupMessageListener();
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
    
    // Initial scan
    this.scanForLinks();
    
    // Delayed scan for dynamic content
    setTimeout(() => {
      console.log('WhatDidISign: Performing delayed scan for dynamic content...');
      this.scanForLinks();
    }, 2000);
    
    // Start observing for future changes
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
    indicator.innerHTML = '📋';
    indicator.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      background: #4CAF50;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      cursor: pointer;
    `;

    // Make parent element relatively positioned
    const parent = link.element.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(indicator);
    }

    // Add click handler
    indicator.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleIndicatorClick(link);
    });
  }

  private handleIndicatorClick(link: DetectedLink): void {
    chrome.runtime.sendMessage({
      action: 'summarize',
      url: link.url,
      type: link.type
    });
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
      setTimeout(() => this.scanForLinks(), 100);
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
