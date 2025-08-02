# WhatDidISign

A Chrome extension that automatically detects Terms & Conditions and Privacy Policy links on websites and provides AI-powered summaries with risk assessments.

## Features

**Smart Detection**
- Automatically finds T&C and Privacy Policy links on any website
- Real-time scanning with visual indicators
- Works across all major platforms

**AI-Powered Analysis**
- Uses Google's Gemini AI for document analysis
- Works out of the box with built-in AI rotation system
- Extracts key points in plain language
- Identifies red flags and concerning clauses
- Provides risk scores from 0-100
- Highlights data rights and how to exercise them

**Modern Interface**
- Clean, minimal design with orange accent theme
- Hover tooltips for quick previews
- Inline analysis popups
- Mobile-inspired user experience

**Smart Caching**
- Stores summaries for popular services
- Reduces API usage and costs
- Instant access to previously analyzed documents

## Installation

**Manual Installation (Developer Mode)**
1. Download or clone this repository
2. Run `npm install && npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `dist` folder

## Setup

**No Setup Required!**
WhatDidISign works out of the box with our built-in Google AI access. The extension uses smart API rotation across multiple keys for optimal performance and minimal rate limits.

**Optional: Add Your Own API Key**
For additional requests or as a backup:
1. Click the WhatDidISign extension icon
2. Go to the "Settings" tab
3. Add your Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Click "Save Settings"

## Usage

1. Visit any website - the extension automatically scans for legal document links
2. Orange dots appear next to detected links
3. Hover over dots for quick previews or click for full analysis
4. Review summaries with risk assessments and key points

## Risk Levels

- **Low Risk (0-40)**: Generally user-friendly terms
- **Medium Risk (41-70)**: Some concerning clauses, review carefully  
- **High Risk (71-100)**: Multiple red flags, proceed with caution

## API System

**Built-in API Rotation**
- 4 Google AI API keys rotating automatically
- Up to 60 requests per minute combined
- Smart fallback to user's personal key if needed
- Minimal rate limiting for better user experience

**Cost & Limits**
- Extension works completely free for most users
- Built-in quota handles typical usage patterns
- Add personal API key for heavy usage or as backup

## Privacy

- No data collection or user tracking
- Extension runs entirely in your browser
- Only document text is sent to Google AI for analysis
- API keys stored locally in your browser

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Watch for changes
npm run watch
```

## Project Structure

```
src/
├── chrome/           # Chrome extension scripts
│   ├── background.ts # Service worker
│   └── content.ts   # Content script for detection
├── components/      # React UI components
│   └── Popup.tsx   # Main popup interface
├── utils/          # Utility functions
│   └── aiService.ts # AI API integration with rotation
└── types/          # TypeScript definitions
```

## License

MIT License - see LICENSE file for details.

## Support

For issues or feature requests, please use GitHub Issues.

*WhatDidISign is not a substitute for legal advice. Always consult with a qualified attorney for important legal decisions.*
