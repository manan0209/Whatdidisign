# WhatDidISign - AI-Powered Terms & Conditions Summarizer

## Overview

WhatDidISign is a Chrome browser extension that automatically detects Terms and Conditions (T&C) and Privacy Policy links on webpages, fetches and summarizes their contents using AI, and presents them in a clear, user-friendly format.

## 🚀 Features

- **Real-time Detection**: Automatically identifies T&C, Privacy Policy, and Cookie Policy links on any webpage
- **AI-Powered Summarization**: Uses OpenAI GPT-3.5-turbo to generate concise, plain-language summaries
- **Risk Assessment**: Highlights concerning clauses and provides risk scoring (0-1 scale)
- **Data Rights Information**: Extracts and explains user rights regarding personal data
- **Smart Caching**: Stores summaries locally to reduce API costs and improve performance
- **Red Flag Detection**: Automatically identifies problematic terms like arbitration clauses, auto-renewal, data sharing
- **Multiple UI Modes**: Popup, sidebar, and tooltip interfaces
- **Privacy-First**: No personal data collection, all processing happens locally or via secure API

## 📋 Project Structure

```
WhatDidISign/
├── src/
│   ├── chrome/              # Chrome extension scripts
│   │   ├── background.ts    # Service worker for API calls and caching
│   │   └── content.ts       # Content script for link detection
│   ├── components/          # React components
│   │   └── Popup.tsx        # Main popup UI component
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Interface definitions
│   └── popup.tsx            # Popup entry point
├── backend/                 # Optional backend API
│   ├── server.js            # Express.js server
│   ├── package.json         # Backend dependencies
│   └── .env.example         # Environment variables template
├── icons/                   # Extension icons
├── manifest.json            # Chrome extension manifest
├── popup.html              # Popup HTML template
├── popup.css               # Popup styles
├── content.css             # Content script styles
└── webpack.config.js       # Build configuration
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Chrome browser
- OpenAI API key

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd WhatDidISign
npm install
```

### 2. Build the Extension
```bash
npm run build
```

### 3. Load in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select the `dist` folder
4. The extension should now appear in your Chrome toolbar

### 4. Configure API Key
1. Click the extension icon in Chrome
2. Go to Settings tab
3. Enter your OpenAI API key
4. Save settings

## 💰 Cost Analysis & Free/Minimal Cost Strategy

### Free Components
- Chrome extension development and distribution
- Local storage and caching
- Basic link detection
- User interface

### Minimal Cost Components
- **OpenAI API**: ~$0.002 per 1k tokens (approximately $0.01-0.05 per summary)
- **Backend hosting** (optional): $5-10/month for basic VPS
- **Domain** (optional): $10-15/year

### Cost Optimization Strategies
1. **Smart Caching**: Cache summaries for popular services (Google, Facebook, etc.)
2. **Batch Processing**: Process multiple documents in single API calls
3. **Text Truncation**: Limit input text to essential content
4. **Local Processing**: Use local models for basic text analysis
5. **Community Sharing**: Share cached summaries (with privacy controls)

### Revenue Model Options
- **Freemium**: Basic features free, premium features paid
- **Usage-based**: Pay per summary after free tier
- **Subscription**: Monthly fee for unlimited usage
- **One-time purchase**: Buy once, use forever

## 🎯 Target Users

### Primary Users
- **Privacy-conscious individuals**: People who care about their digital rights
- **Busy professionals**: Those who don't have time to read lengthy legal documents
- **Students and researchers**: People studying digital rights and privacy
- **Parents**: Protecting family privacy online

### Secondary Users
- **Journalists**: Investigating company practices
- **Legal professionals**: Quick overview of standard terms
- **Digital rights activists**: Monitoring concerning practices
- **Businesses**: Understanding competitor policies

## 🚀 Development

### Build Commands
```bash
npm run build      # Production build
npm run dev        # Development build with watch
npm run clean      # Clean dist folder
npm run lint       # Run ESLint
```

### Backend Development (Optional)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev        # Start development server
```

## 🔒 Privacy & Security

### Data Handling
- **No Personal Data Collection**: Extension doesn't collect user data
- **Local Processing**: Most operations happen locally
- **Secure API Calls**: All external calls use HTTPS
- **No Tracking**: No analytics or tracking scripts

### Security Features
- **Content Security Policy**: Prevents XSS attacks
- **Permission Minimization**: Only requests necessary permissions
- **Input Sanitization**: All user inputs are sanitized
- **HTTPS Only**: All external communication encrypted

**Built with ❤️ for digital privacy and transparency**
