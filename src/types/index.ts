/// <reference lib="dom" />

export interface DetectedLink {
  url: string;
  text: string;
  type: 'terms' | 'privacy' | 'cookies' | 'eula';
  element: HTMLElement;
  confidence: number;
}

export interface Summary {
  id: string;
  url: string;
  title: string;
  type: 'terms' | 'privacy' | 'cookies' | 'eula';
  keyPoints: string[];
  redFlags: RedFlag[];
  dataRights: DataRight[];
  riskScore: number;
  lastUpdated: string;
  cached: boolean;
}

export interface RedFlag {
  type: 'arbitration' | 'auto-renewal' | 'data-sharing' | 'liability' | 'termination' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high';
  quote: string;
}

export interface DataRight {
  type: 'access' | 'deletion' | 'portability' | 'correction' | 'opt-out';
  description: string;
  available: boolean;
  process: string;
}

export interface CacheEntry {
  url: string;
  summary: Summary;
  timestamp: number;
  hits: number;
}

export interface AIProvider {
  name: string;
  apiKey: string;
  model: string;
  endpoint: string;
  costPer1K: number;
  provider: 'openai' | 'gemini' | 'local';
}

export interface Settings {
  enabled: boolean;
  aiProvider: AIProvider;
  cacheEnabled: boolean;
  cacheExpiry: number; // in days
  showRedFlags: boolean;
  riskThreshold: number;
  uiMode: 'popup' | 'sidebar' | 'tooltip';
  notifications: boolean;
  preferredProvider: 'gemini' | 'openai' | 'local';
}
