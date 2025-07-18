const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const NodeCache = require('node-cache');
const axios = require('axios');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cache for 1 hour by default
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (implement as needed)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Utility function to extract text from HTML
function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style').remove();
  
  // Get text content
  return $.text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000); // Limit to 10k characters
}

// Utility function to categorize document type
function categorizeDocument(url, text) {
  const urlLower = url.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (urlLower.includes('privacy') || textLower.includes('privacy policy')) {
    return 'privacy';
  }
  if (urlLower.includes('cookie') || textLower.includes('cookie policy')) {
    return 'cookies';
  }
  if (urlLower.includes('terms') || textLower.includes('terms of service')) {
    return 'terms';
  }
  if (urlLower.includes('eula') || textLower.includes('end user license')) {
    return 'eula';
  }
  
  return 'terms'; // default
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch and summarize document
app.post('/api/summarize', async (req, res) => {
  try {
    const { url, type } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Check cache first
    const cacheKey = `summary_${url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    // Fetch the document
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WhatDidISign/1.0; +https://whatdidisign.com)'
      }
    });
    
    const text = extractTextFromHtml(response.data);
    const documentType = type || categorizeDocument(url, text);
    
    // Generate AI summary
    const summary = await generateAISummary(text, documentType, url);
    
    // Cache the result
    cache.set(cacheKey, summary);
    
    res.json(summary);
    
  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      error: 'Failed to summarize document',
      details: error.message 
    });
  }
});

// Get multiple summaries
app.post('/api/batch-summarize', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }
    
    if (urls.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 URLs allowed per batch' });
    }
    
    const results = await Promise.allSettled(
      urls.map(async (urlData) => {
        const { url, type } = urlData;
        
        // Check cache first
        const cacheKey = `summary_${url}`;
        const cached = cache.get(cacheKey);
        if (cached) {
          return { ...cached, cached: true };
        }
        
        // Fetch and summarize
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WhatDidISign/1.0; +https://whatdidisign.com)'
          }
        });
        
        const text = extractTextFromHtml(response.data);
        const documentType = type || categorizeDocument(url, text);
        const summary = await generateAISummary(text, documentType, url);
        
        // Cache the result
        cache.set(cacheKey, summary);
        
        return summary;
      })
    );
    
    const summaries = results.map((result, index) => ({
      url: urls[index].url,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
    
    res.json({ summaries });
    
  } catch (error) {
    console.error('Batch summarization error:', error);
    res.status(500).json({ 
      error: 'Failed to process batch request',
      details: error.message 
    });
  }
});

// Get cache statistics
app.get('/api/cache-stats', (req, res) => {
  const stats = cache.getStats();
  res.json({
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.hits / (stats.hits + stats.misses) || 0
  });
});

// Clear cache
app.post('/api/clear-cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

// AI Summary Generation
async function generateAISummary(text, type, url) {
  const prompt = buildPrompt(text, type);
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    return parseAIResponse(aiResponse, url, type);
    
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI summary');
  }
}

function buildPrompt(content, type) {
  const truncatedContent = content.substring(0, 8000);
  
  return `
Please analyze this ${type} document and provide a structured summary in JSON format:

${truncatedContent}

Provide a JSON response with:
1. keyPoints: Array of 3-5 main points in plain language
2. redFlags: Array of concerning clauses with type, description, severity (low/medium/high), and relevant quote
3. dataRights: Array of user rights with type, description, availability, and process
4. riskScore: Number between 0-1 where 1 is highest risk

Example format:
{
  "keyPoints": ["Service can be terminated at any time", "Data is stored for analytical purposes"],
  "redFlags": [{"type": "arbitration", "description": "Disputes must be resolved through arbitration", "severity": "high", "quote": "All disputes shall be resolved through binding arbitration"}],
  "dataRights": [{"type": "deletion", "description": "Right to delete personal data", "available": true, "process": "Contact support to request deletion"}],
  "riskScore": 0.6
}

Respond only with valid JSON.
`;
}

function parseAIResponse(response, url, type) {
  try {
    const parsed = JSON.parse(response);
    
    return {
      id: generateId(),
      url,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Summary`,
      type,
      keyPoints: parsed.keyPoints || [],
      redFlags: parsed.redFlags || [],
      dataRights: parsed.dataRights || [],
      riskScore: Math.min(1, Math.max(0, parsed.riskScore || 0)),
      lastUpdated: new Date().toISOString(),
      cached: false
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    
    // Fallback response
    return {
      id: generateId(),
      url,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Summary`,
      type,
      keyPoints: ['Unable to parse document. Please try again.'],
      redFlags: [],
      dataRights: [],
      riskScore: 0,
      lastUpdated: new Date().toISOString(),
      cached: false
    };
  }
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`WhatDidISign backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
