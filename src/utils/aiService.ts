import { Summary, AIProvider } from '../types';

interface AIResponse {
  keyPoints: string[];
  redFlags: Array<{
    type: 'arbitration' | 'auto-renewal' | 'data-sharing' | 'liability' | 'termination' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high';
    quote: string;
  }>;
  dataRights: Array<{
    type: 'access' | 'deletion' | 'portability' | 'correction' | 'opt-out';
    description: string;
    available: boolean;
    process: string;
  }>;
  riskScore: number;
}

// Placeholder API keys for GitHub (replaced during build process)
// The built extension will have working API keys injected
const DEFAULT_API_KEYS = [
  'PLACEHOLDER_API_KEY_1',
  'PLACEHOLDER_API_KEY_2', 
  'PLACEHOLDER_API_KEY_3',
  'PLACEHOLDER_API_KEY_4'
];

export class AIService {
  private provider: AIProvider;
  private static currentKeyIndex = 0;
  private static requestCounts: Map<string, { count: number, resetTime: number }> = new Map();
  private static readonly REQUESTS_PER_MINUTE = 15; 
  private static readonly MINUTE_IN_MS = 60 * 1000;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  private static getNextApiKey(): string {
    // Rotate
    const key = DEFAULT_API_KEYS[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % DEFAULT_API_KEYS.length;
    return key;
  }

  private static isKeyRateLimited(apiKey: string): boolean {
    const now = Date.now();
    const keyStats = this.requestCounts.get(apiKey);
    
    if (!keyStats) {
      return false;
    }
    if (now - keyStats.resetTime >= this.MINUTE_IN_MS) {
      keyStats.count = 0;
      keyStats.resetTime = now;
      return false;
    }
    
    return keyStats.count >= this.REQUESTS_PER_MINUTE;
  }

  public static checkKeyRateLimit(apiKey: string): boolean {
    return this.isKeyRateLimited(apiKey);
  }

  private static incrementKeyUsage(apiKey: string): void {
    const now = Date.now();
    const keyStats = this.requestCounts.get(apiKey);
    
    if (!keyStats || now - keyStats.resetTime >= this.MINUTE_IN_MS) {
      this.requestCounts.set(apiKey, { count: 1, resetTime: now });
    } else {
      keyStats.count++;
    }
  }

  private getAvailableApiKey(): string {
    // Check if default keys are properly configured
    if (hasDefaultApiKeys()) {
      // First, try to use our default API keys with rotation
      for (let i = 0; i < DEFAULT_API_KEYS.length; i++) {
        const key = AIService.getNextApiKey();
        if (!AIService.isKeyRateLimited(key)) {
          return key;
        }
      }
    }
    
    // If default keys aren't configured or all are rate limited, use user's custom key
    if (this.provider.apiKey && this.provider.apiKey.trim() !== '') {
      if (!AIService.isKeyRateLimited(this.provider.apiKey)) {
        console.log('Using user-provided API key');
        return this.provider.apiKey;
      }
    }
    
    // If we have default keys but they're rate limited, use them anyway
    if (hasDefaultApiKeys()) {
      console.warn('All default API keys appear to be rate limited, attempting with rotated key');
      return AIService.getNextApiKey();
    }
    
    // No valid API keys available
    throw new Error('No API keys configured. Please add your Google AI API key in settings or contact support.');
  }

  async summarizeDocument(content: string, url: string, type: string): Promise<Summary> {
    try {
      let aiResponse: AIResponse;

      switch (this.provider.provider) {
        case 'gemini':
          aiResponse = await this.callGeminiAPI(content, type);
          break;
        case 'openai':
          aiResponse = await this.callOpenAIAPI(content, type);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.provider.provider}`);
      }

      return this.formatSummary(aiResponse, url, type);
    } catch (error) {
      console.error('AI summarization error:', error);
      
      // If it's a rate limit error, provide helpful message
      if (error instanceof Error && error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a moment or add your own API key in settings.');
      }
      
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async callGeminiAPI(content: string, type: string): Promise<AIResponse> {
    const prompt = this.buildPrompt(content, type);
    
    // Get available API key with rotation/fallback logic
    const apiKey = this.getAvailableApiKey();
    AIService.incrementKeyUsage(apiKey);
    
    // Updated model name - Gemini 1.5 Flash is the current free model
    const modelName = 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error(`API rate limit exceeded (${response.status}). Our servers are busy - please try again in a moment.`);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    return this.parseAIResponse(responseText);
  }

  private async callOpenAIAPI(content: string, type: string): Promise<AIResponse> {
    const prompt = this.buildPrompt(content, type);
    
    // For OpenAI, we still use the user's API key since we don't provide OpenAI keys
    const apiKey = this.provider.apiKey;
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key not configured. Please add your API key in settings or switch to Gemini (default).');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.provider.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analyzer specializing in Terms of Service and Privacy Policies. Provide clear, concise summaries for everyday users. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error(`OpenAI rate limit exceeded (${response.status}). Please try again in a moment.`);
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    const responseText = data.choices[0].message.content;
    return this.parseAIResponse(responseText);
  }

  private buildPrompt(content: string, type: string): string {
    // Truncate content to avoid token limits
    const truncatedContent = content.substring(0, 8000);
    
    return `
Please analyze this ${type} document and provide a structured summary in JSON format.

Document content:
${truncatedContent}

Analyze the document and respond with a JSON object containing:

1. "keyPoints": Array of 3-5 main points in simple, plain language that regular users can understand
2. "redFlags": Array of concerning clauses, each with:
   - "type": Category like "arbitration", "auto-renewal", "data-sharing", "liability", "termination"
   - "description": Plain language explanation of the concern
   - "severity": "low", "medium", or "high" 
   - "quote": Relevant quote from the document (keep it short)
3. "dataRights": Array of user rights regarding their data, each with:
   - "type": Right type like "access", "deletion", "portability", "correction", "opt-out"
   - "description": What this right means for the user
   - "available": true/false if this right is granted
   - "process": How to exercise this right (if available)
4. "riskScore": Number between 0 and 1, where 0 is very user-friendly and 1 is very concerning

Example response format:
{
  "keyPoints": [
    "Service can terminate your account at any time without notice",
    "Your data may be shared with third-party partners for advertising",
    "You must resolve disputes through arbitration, not courts"
  ],
  "redFlags": [
    {
      "type": "arbitration",
      "description": "You cannot take the company to court - disputes must be resolved through private arbitration",
      "severity": "high",
      "quote": "All disputes shall be resolved exclusively through binding arbitration"
    }
  ],
  "dataRights": [
    {
      "type": "deletion",
      "description": "Right to delete your personal data",
      "available": true,
      "process": "Contact support with a deletion request"
    }
  ],
  "riskScore": 0.7
}

Respond ONLY with valid JSON. Do not include any other text or explanations.
`;
  }

  private parseAIResponse(responseText: string): AIResponse {
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      
      const parsed = JSON.parse(jsonText);
      
      // Validate and sanitize the response
      return {
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 6) : [],
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 5).map((flag: any) => ({
          type: ['arbitration', 'auto-renewal', 'data-sharing', 'liability', 'termination'].includes(flag.type) ? flag.type : 'other',
          description: flag.description || 'No description provided',
          severity: ['low', 'medium', 'high'].includes(flag.severity) ? flag.severity : 'medium',
          quote: flag.quote || ''
        })) : [],
        dataRights: Array.isArray(parsed.dataRights) ? parsed.dataRights.slice(0, 5).map((right: any) => ({
          type: ['access', 'deletion', 'portability', 'correction', 'opt-out'].includes(right.type) ? right.type : 'access',
          description: right.description || 'No description provided',
          available: Boolean(right.available),
          process: right.process || 'Not specified'
        })) : [],
        riskScore: Math.min(1, Math.max(0, Number(parsed.riskScore) || 0))
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw response:', responseText);
      
      // Return a fallback response
      return {
        keyPoints: ['Unable to parse the document. The content may be too complex or corrupted.'],
        redFlags: [],
        dataRights: [],
        riskScore: 0
      };
    }
  }

  private formatSummary(aiResponse: AIResponse, url: string, type: string): Summary {
    return {
      id: this.generateId(),
      url,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Summary`,
      type: type as 'terms' | 'privacy' | 'cookies' | 'eula',
      keyPoints: aiResponse.keyPoints,
      redFlags: aiResponse.redFlags,
      dataRights: aiResponse.dataRights,
      riskScore: aiResponse.riskScore,
      lastUpdated: new Date().toISOString(),
      cached: false
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Default providers configuration
export const DEFAULT_PROVIDERS: Record<string, AIProvider> = {
  gemini: {
    name: 'Google Gemini (Default)',
    apiKey: '', // This will be populated by our rotation system
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    costPer1K: 0, // Free tier
    provider: 'gemini'
  },
  openai: {
    name: 'OpenAI GPT-3.5 (Custom Key Required)',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    costPer1K: 0.002,
    provider: 'openai'
  }
};

// Helper function to check if default API keys are configured
export const hasDefaultApiKeys = (): boolean => {
  return DEFAULT_API_KEYS.every(key => 
    key && 
    key.startsWith('AIzaSy') && 
    key.length > 30 && 
    !key.includes('_REPLACE_WITH_YOUR_') &&
    !key.includes('_HERE')
  );
};

// Helper function to get API rotation status
export const getApiRotationStatus = (): { totalKeys: number, availableKeys: number, configured: boolean } => {
  const configured = hasDefaultApiKeys();
  const availableKeys = configured ? DEFAULT_API_KEYS.filter(key => 
    !AIService.checkKeyRateLimit(key)
  ).length : 0;
  
  return {
    totalKeys: DEFAULT_API_KEYS.length,
    availableKeys,
    configured
  };
};
