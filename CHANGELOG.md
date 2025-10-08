# Changelog

All notable changes to WhatDidISign will be documented in this file.

## [1.4] - 2025-10-08

### Added
- Hack Club AI integration as the primary AI provider
- Support for multiple AI providers (Hack Club AI, Google Gemini, OpenAI)
- Enhanced JSON response parsing to handle markdown code blocks

### Changed
- Default AI provider changed from Google Gemini to Hack Club AI
- No API key required for default setup (Hack Club AI is free and unlimited)
- Updated manifest description to mention Hack Club AI
- Simplified README documentation without emojis
- Updated settings UI to show Hack Club AI as the default option

### Removed
- Hardcoded API key rotation system (security improvement)
- Dependency on Google Gemini API keys for default functionality

### Security
- Removed exposed API keys from codebase
- No longer storing API keys in build scripts

## [1.0.0] - 2024-08-03

### Added
- Initial release
- Automatic detection of Terms & Conditions and Privacy Policy links
- AI-powered document analysis with risk assessment
- Visual indicators with orange dots
- Hover tooltips and detailed analysis popups
- Smart caching system
- React-based popup UI with 3 tabs (Links, Analysis, Settings)
- Support for Google Gemini AI
- Dark theme with orange accent colors
