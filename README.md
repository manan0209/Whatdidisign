# WhatDidISign - AI Legal Document Analyzer

![WhatDidISign Logo](icons/icon128.png)

**Never sign another document blindly.** WhatDidISign is a powerful Chrome extension that automatically detects Terms & Conditions and Privacy Policy links on websites, then uses AI to provide clear, consumer-friendly summaries with risk assessments.

## 🚀 Features

### 🔍 **Smart Detection**
- Automatically finds T&C and Privacy Policy links on any website
- Works on all major sites (Google, Facebook, Twitter, GitHub, etc.)
- Detects links in footers, navigation, and content areas
- Real-time scanning as you browse

### 🧠 **AI-Powered Analysis**
- Uses Google's Gemini AI (free tier) for document analysis
- Extracts key points in plain, understandable language
- Identifies red flags and concerning clauses
- Highlights your data rights and how to exercise them
- Provides risk scores from 0-100

### ⚡ **Smart Caching**
- Stores summaries for popular services
- Reduces AI API usage and costs
- Instant access to previously analyzed documents
- Configurable cache expiration

### 🎨 **Modern UI**
- Clean, professional interface
- Mobile-inspired design
- Easy-to-read risk assessments
- Color-coded warning levels
- Intuitive navigation

## 📱 Screenshots

### Link Detection
The extension automatically detects legal document links and shows confidence scores.

### AI Analysis
Get comprehensive summaries with key points, warnings, and data rights information.

### Risk Assessment
Visual risk scores help you quickly understand document safety levels.

## 🛠 Installation

### Chrome Web Store (Coming Soon)
*Extension will be available in the Chrome Web Store soon.*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `dist` folder
5. The extension icon will appear in your browser toolbar

## ⚙️ Setup

### 1. Get a Free Google AI API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key for the next step

### 2. Configure the Extension
1. Click the WhatDidISign extension icon
2. Go to the "Settings" tab
3. Paste your API key in the "Google AI API Key" field
4. Click "Save Settings"

**That's it!** You're ready to start analyzing legal documents.

## 🔧 Usage

### Analyzing Documents
1. **Visit any website** - The extension automatically scans for legal document links
2. **Click the extension icon** - View detected Terms & Conditions and Privacy Policy links
3. **Click "Analyze Document"** - Get an AI-powered summary with risk assessment
4. **Review the analysis** - Check key points, red flags, and your data rights

### Understanding Risk Scores
- **🟢 0-40: Low Risk** - Generally user-friendly terms
- **🟡 41-70: Medium Risk** - Some concerning clauses, review carefully
- **🔴 71-100: High Risk** - Multiple red flags, proceed with caution

### Common Red Flags
- **Arbitration Clauses** - Prevents you from taking the company to court
- **Auto-Renewal** - Automatic subscription renewals without clear notice
- **Data Sharing** - Your data may be sold to third parties
- **Liability Limitations** - Company limits responsibility for damages
- **Broad Termination Rights** - Service can be terminated without notice

## 🔒 Privacy & Security

### Your Privacy First
- **No data collection** - We don't track your browsing or store personal data
- **Local processing** - Extension runs entirely in your browser
- **API communication** - Only sends document text to Google AI for analysis
- **No user tracking** - No analytics, cookies, or behavioral monitoring

### API Usage
- Uses Google's Gemini AI API for document analysis
- Your API key is stored locally in your browser
- Document text is sent to Google AI for processing
- No document content is stored by WhatDidISign

## 💡 Tips for Best Results

### Getting Accurate Analysis
- Ensure you have a stable internet connection
- Use the extension on the actual document pages (not just link pages)
- Check that your API key is properly configured
- Some documents may take 10-30 seconds to analyze

### Managing API Costs
- Google Gemini free tier: 15 requests/minute, 1,500/day
- Enable caching to reduce repeated API calls
- Cache common services (Google, Facebook, etc.) for instant access
- Consider upgrading to paid tier for heavy usage

## 🛠 Configuration Options

### AI Provider Settings
- **Google Gemini** (Recommended): Free tier with generous limits
- **OpenAI GPT-3.5**: Paid option with consistent performance

### Cache Settings
- **Enable/Disable Caching**: Store summaries locally
- **Cache Expiry**: How long to keep cached summaries (1-365 days)
- **Clear Cache**: Remove all stored summaries

### Display Options
- **Show Red Flags**: Toggle warning displays
- **Risk Threshold**: Minimum risk level to highlight
- **Notifications**: Browser notifications for high-risk documents

## 🤝 Contributing

We welcome contributions! This is an open-source project aimed at making legal documents more accessible to everyone.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/whatdidisign.git
cd whatdidisign

# Install dependencies
npm install

# Build for development
npm run build

# Watch for changes
npm run watch
```

### Project Structure
```
src/
├── chrome/           # Chrome extension scripts
│   ├── background.ts # Service worker
│   └── content.ts   # Content script for link detection
├── components/      # React UI components
│   └── Popup.tsx   # Main popup interface
├── utils/          # Utility functions
│   └── aiService.ts # AI API integration
└── types.ts        # TypeScript type definitions
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Extension not detecting links?**
- Scroll to the bottom of the page
- Try refreshing the page
- Check the browser console for errors

**API errors?**
- Verify your API key is correct
- Check your Google AI API quota
- Ensure you have internet connectivity

**Analysis taking too long?**
- Large documents may take 30+ seconds
- Check your internet connection
- Try refreshing and analyzing again

### Get Help
- 📧 **Email**: support@whatdidisign.com
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/whatdidisign/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/whatdidisign/discussions)

## 🙏 Acknowledgments

- **Google AI** for providing the Gemini API
- **OpenAI** for alternative AI processing
- **Chrome Extensions API** for the platform
- **React** for the user interface
- **TypeScript** for type safety

---

**Made with ❤️ for a more transparent internet.**

*WhatDidISign is not a substitute for legal advice. Always consult with a qualified attorney for important legal decisions.*
