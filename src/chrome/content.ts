import { DetectedLink } from '../types';

class TCDetector {
  private static readonly KEYWORDS = {
    terms: [
      'terms of service', 'terms of use', 'terms & conditions', 'terms and conditions',
      'user agreement', 'service agreement', 'legal terms', 'tos', 'eula',
      'end user license agreement', 'licensing agreement'
    ],
    privacy: [
      'privacy policy', 'privacy notice', 'privacy statement', 'data policy',
      'data protection', 'privacy practices', 'information collection'
    ],
    cookies: [
      'cookie policy', 'cookie notice', 'cookie preferences', 'cookie settings',
      'cookies and tracking', 'cookie information'
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
  }

  init(): void {
    if (this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    this.scanForLinks();
    this.startObserving();
    this.notifyBackground();
  }

  private scanForLinks(): void {
    const links = document.querySelectorAll('a[href]');
    const newLinks: DetectedLink[] = [];

    links.forEach(link => {
      const detected = this.analyzeLink(link as HTMLAnchorElement);
      if (detected && !this.isDuplicate(detected)) {
        newLinks.push(detected);
        this.addVisualIndicator(detected);
      }
    });

    this.detectedLinks.push(...newLinks);
    
    if (newLinks.length > 0) {
      this.notifyBackground();
    }
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

    // Find the highest scoring type
    const bestType = Object.entries(typeScores).reduce((a, b) => 
      typeScores[a[0] as keyof typeof typeScores] > typeScores[b[0] as keyof typeof typeScores] ? a : b
    );

    const confidence = typeScores[bestType[0] as keyof typeof typeScores];
    
    if (confidence > 0.3) { // Threshold for detection
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
