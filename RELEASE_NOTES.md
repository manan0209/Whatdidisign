# WhatDidISign Release Notes

## v1.0.1 - Hack Club AI Integration

### What's New

#### Completely Free AI Analysis
- Integrated with Hack Club AI for unlimited, free document analysis
- No API key required - works out of the box
- Powered by Qwen 3 32B model for fast and accurate summaries

#### Enhanced Provider Options
- Primary: Hack Club AI (free, unlimited, no setup)
- Optional: Google Gemini (requires API key)
- Optional: OpenAI GPT-3.5 (requires API key)

#### Improvements
- Removed dependency on hardcoded API keys for security
- Simplified setup process - no configuration needed
- Updated UI to reflect free, unlimited analysis
- Cleaner README documentation

### Technical Changes
- Migrated from Google Gemini to Hack Club AI as default provider
- Updated AI service to use OpenAI-compatible chat completions format
- Enhanced JSON parsing to handle markdown code blocks
- Improved error messages and user feedback

---

## v1.0.0 - Initial Release

### Features

#### Smart Detection
- Automatic link detection for Terms & Conditions and Privacy Policy links
- Visual indicators with orange dots next to detected links
- Real-time scanning as you browse any website

#### AI-Powered Analysis
- Document analysis with risk assessment
- Risk scores from 0-100
- Key points extraction in plain language
- Red flag detection for concerning clauses
- Data rights information extraction

#### Modern Interface
- Dark theme with orange accent colors
- Mobile-optimized popup interface
- Smooth animations and micro-interactions
- Hover previews and detailed analysis popups

#### Privacy-First Design
- No data collection - everything stays in your browser
- Local storage only for cached analyses
- Open source for complete transparency

#### Smart Features
- Intelligent caching to reduce API usage
- Hover previews for quick document insights
- Detailed analysis with risk breakdowns

### Installation

1. Download the `WhatDidISign-v1.0.1.zip` file
2. Extract the ZIP file to a folder on your computer
3. Open Chrome and go to `chrome://extensions/`
4. Enable Developer mode (toggle in top-right corner)
5. Click "Load unpacked" and select the extracted `dist` folder

### Supported Websites

WhatDidISign works on all websites and automatically detects:
- Terms of Service / Terms of Use
- Privacy Policies
- Cookie Policies
- End User License Agreements (EULAs)

### Known Issues

- Some complex legal documents may take 10-30 seconds to analyze
- Very long documents (>8,000 characters) are automatically truncated

### Support

- Website: https://whatdidisign.tech
- GitHub: https://github.com/manan0209/WhatDidISign
- Issues: https://github.com/manan0209/WhatDidISign/issues

---

**Download WhatDidISign v1.0.1**: `WhatDidISign-v1.0.1.zip`

WhatDidISign is not a substitute for legal advice. Always consult with a qualified attorney for important legal decisions.
