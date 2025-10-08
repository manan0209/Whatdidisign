# WhatDidISign

A Chrome extension that automatically detects Terms & Conditions and Privacy Policy links on websites and provides AI-powered summaries with risk assessments.

## Features

- Automatic detection of T&C and Privacy Policy links on any website
- AI-powered analysis using Hack Club AI (completely free, no API key required)
- Risk scoring from 0-100 with red flag identification
- Key points extraction in plain language
- Data rights information extraction
- Smart caching system for instant access to analyzed documents
- Visual indicators with hover tooltips and detailed analysis popups

## Installation

1. Download or clone this repository
2. Run `npm install && npm run build`
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the `dist` folder

## Usage

1. Visit any website - the extension automatically scans for legal document links
2. Orange dots appear next to detected links
3. Hover over dots for quick previews or click for full AI analysis
4. Review summaries with risk assessments and key points

## Risk Levels

- Low Risk (0-40): Generally user-friendly terms
- Medium Risk (41-70): Some concerning clauses, review carefully
- High Risk (71-100): Multiple red flags, proceed with caution

## AI Provider

This extension uses Hack Club AI, a free and unlimited service for teens in Hack Club. No API key is required. The extension can also be configured to use Google Gemini or OpenAI with your own API keys if preferred.

## Privacy

- No data collection or user tracking
- Extension runs entirely in your browser
- Only document text is sent to the AI service for analysis
- All data stored locally in your browser

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build for development with watch mode
npm run dev
```

## License

MIT License - see LICENSE file for details.

WhatDidISign is not a substitute for legal advice. Always consult with a qualified attorney for important legal decisions.
