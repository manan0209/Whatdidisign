import React, { useState, useEffect } from 'react';
import { DetectedLink, Summary, Settings } from '../types';
import { DEFAULT_PROVIDERS } from '../utils/aiService';

const Popup: React.FC = () => {
  const [links, setLinks] = useState<DetectedLink[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'links' | 'summaries' | 'settings'>('links');
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get detected links from current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          const links = await chrome.tabs.sendMessage(tabs[0].id!, { action: 'getLinks' });
          if (links) {
            setLinks(links);
          }
        } catch (error) {
          console.log('Content script not ready or no links detected');
          setLinks([]);
        }
      }

      // Get settings from background script
      try {
        const settings = await new Promise<any>((resolve, reject) => {
          chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        
        if (settings && !settings.error) {
          setSettings(settings);
          // Check if this is first time (no API key set)
          setIsFirstTime(!settings.aiProvider.apiKey);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Use default settings if we can't load from background
        const defaultSettings: Settings = {
          enabled: true,
          preferredProvider: 'gemini' as const,
          aiProvider: {
            name: 'Google Gemini',
            apiKey: '',
            model: 'gemini-1.5-flash',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            costPer1K: 0,
            provider: 'gemini' as const
          },
          cacheEnabled: true,
          cacheExpiry: 30,
          showRedFlags: true,
          riskThreshold: 0.7,
          uiMode: 'popup' as const,
          notifications: true
        };
        setSettings(defaultSettings);
        setIsFirstTime(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

    const handleSummarize = async (link: DetectedLink) => {
    setLoading(true);
    setError(null);
    
    try {
      const summary = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'summarize',
          url: link.url,
          type: link.type
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (summary.error) {
        setError(summary.error);
      } else {
        setSummaries(prev => [...prev, summary]);
        setActiveTab('summaries');
      }
    } catch (error) {
      setError('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number): string => {
    if (score > 0.7) return '#f44336';
    if (score > 0.4) return '#ff9800';
    return '#4caf50';
  };

  const getRiskLabel = (score: number): string => {
    if (score > 0.7) return 'High Risk';
    if (score > 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  const LinksTab = () => (
    <div className="tab-content">
      {isFirstTime && !settings?.aiProvider.apiKey && (
        <div className="welcome-banner">
          <div className="welcome-content">
            <h4>Welcome to WhatDidISign!</h4>
            <p>To get started, you'll need a free Google AI API key to power the document analysis.</p>
            <button 
              onClick={() => setActiveTab('settings')}
              className="setup-btn"
            >
              Set Up API Key
            </button>
          </div>
        </div>
      )}
      
      <div className="header">
        <div className="header-content">
          <h3>Terms & Privacy Links</h3>
          <div className="header-meta">
            <span className="count">{links.length} detected</span>
            <button onClick={loadData} className="refresh-btn" title="Refresh scan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="m20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4a9 9 0 0 1-14.85 3.36L23 14"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {links.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h4>No Legal Documents Found</h4>
          <p>We couldn't find any Terms & Conditions or Privacy Policy links on this page.</p>
          <div className="empty-tips">
            <p><strong>Tips:</strong></p>
            <ul>
              <li>Try scrolling to the bottom of the page</li>
              <li>Look for footer sections</li>
              <li>Click refresh to scan again</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="links-list">
          {links.map((link, index) => (
            <div key={index} className="link-card">
              <div className="link-header">
                <div className="link-type-badge" data-type={link.type}>
                  {link.type === 'terms' ? 'Terms of Service' : 
                   link.type === 'privacy' ? 'Privacy Policy' :
                   link.type === 'cookies' ? 'Cookie Policy' : 
                   link.type.toUpperCase()}
                </div>
                <div className="confidence-score">
                  <span className="confidence-value">{Math.round(link.confidence * 100)}%</span>
                  <span className="confidence-label">confidence</span>
                </div>
              </div>
              
              <div className="link-content">
                <h4 className="link-title">{link.text}</h4>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-url">
                  {link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
              
              <div className="link-actions">
                <button 
                  onClick={() => handleSummarize(link)}
                  disabled={loading || !settings?.aiProvider.apiKey}
                  className="analyze-btn"
                  title={!settings?.aiProvider.apiKey ? 'Set up API key first' : 'Analyze with AI'}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11H1l6-6 6 6m0 6l-6 6-6-6h8"></path>
                      </svg>
                      Analyze Document
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SummariesTab = () => (
    <div className="tab-content">
      <div className="header">
        <div className="header-content">
          <h3>Document Analysis</h3>
          <span className="count">{summaries.length} analyzed</span>
        </div>
      </div>
      
      {summaries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h4>No Documents Analyzed Yet</h4>
          <p>Click "Analyze Document" on any detected link to get an AI-powered summary with risk assessment.</p>
        </div>
      ) : (
        <div className="summaries-list">
          {summaries.map((summary, index) => (
            <div key={index} className="summary-card">
              <div className="summary-header">
                <div className="summary-title">
                  <h4>{summary.title}</h4>
                  <div className="summary-meta">
                    <span className="summary-date">
                      {new Date(summary.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="risk-assessment">
                  <div 
                    className={`risk-badge risk-${summary.riskScore > 0.7 ? 'high' : summary.riskScore > 0.4 ? 'medium' : 'low'}`}
                  >
                    <div className="risk-score">{Math.round(summary.riskScore * 100)}</div>
                    <div className="risk-label">{getRiskLabel(summary.riskScore)}</div>
                  </div>
                </div>
              </div>
              
              <div className="summary-content">
                <div className="section">
                  <div className="section-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,11 12,14 22,4"></polyline>
                      <path d="M21,12v7a2,2 0,0,1-2,2H5a2,2 0,0,1-2-2V5a2,2 0,0,1,2-2h11"></path>
                    </svg>
                    <h5>Key Points</h5>
                  </div>
                  <ul className="key-points">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                
                {summary.redFlags.length > 0 && (
                  <div className="section">
                    <div className="section-header warning">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <h5>Warning Signs</h5>
                      <span className="flag-count">{summary.redFlags.length}</span>
                    </div>
                    <div className="red-flags">
                      {summary.redFlags.map((flag, i) => (
                        <div key={i} className={`red-flag severity-${flag.severity}`}>
                          <div className="flag-header">
                            <span className="flag-type">{flag.type.replace('-', ' ').toUpperCase()}</span>
                            <span className={`severity-badge severity-${flag.severity}`}>
                              {flag.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="flag-description">{flag.description}</p>
                          {flag.quote && (
                            <blockquote className="flag-quote">"{flag.quote}"</blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {summary.dataRights.length > 0 && (
                  <div className="section">
                    <div className="section-header positive">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <h5>Your Data Rights</h5>
                    </div>
                    <div className="data-rights">
                      {summary.dataRights.map((right, i) => (
                        <div key={i} className={`data-right ${right.available ? 'available' : 'unavailable'}`}>
                          <div className="right-header">
                            <span className="right-type">{right.type.toUpperCase()}</span>
                            <span className={`availability ${right.available ? 'available' : 'unavailable'}`}>
                              {right.available ? 'Available' : 'Not Available'}
                            </span>
                          </div>
                          <p className="right-description">{right.description}</p>
                          {right.available && right.process && (
                            <div className="right-process">
                              <strong>How to exercise:</strong> {right.process}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SettingsTab = () => {
    const [localSettings, setLocalSettings] = useState<Settings | null>(settings);
    const [saving, setSaving] = useState(false);

    const saveSettings = async () => {
      if (!localSettings) return;
      
      setSaving(true);
      try {
        await chrome.runtime.sendMessage({
          action: 'updateSettings',
          settings: localSettings
        });
        setSettings(localSettings);
      } catch (err) {
        setError('Failed to save settings');
      } finally {
        setSaving(false);
      }
    };

    const clearCache = async () => {
      try {
        await chrome.runtime.sendMessage({ action: 'clearCache' });
        alert('Cache cleared successfully');
      } catch (err) {
        setError('Failed to clear cache');
      }
    };

    if (!localSettings) return <div>Loading settings...</div>;

    return (
      <div className="tab-content">
        <div className="header">
          <h3>Settings</h3>
        </div>
        
        <div className="settings-form">
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={localSettings.enabled}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  enabled: e.target.checked
                })}
              />
              Enable WhatDidISign
            </label>
          </div>
          
          <div className="setting-group">
            <label>AI Provider:</label>
            <select
              value={localSettings.preferredProvider}
              onChange={(e) => {
                const provider = e.target.value as 'gemini' | 'openai';
                setLocalSettings({
                  ...localSettings,
                  preferredProvider: provider,
                  aiProvider: {
                    ...DEFAULT_PROVIDERS[provider],
                    apiKey: localSettings.aiProvider.apiKey // Keep existing API key
                  }
                });
              }}
            >
              <option value="gemini">Google Gemini (Free)</option>
              <option value="openai">OpenAI GPT-3.5 (Paid)</option>
            </select>
          </div>
          
          <div className="setting-group">
            <label>
              {localSettings.preferredProvider === 'gemini' ? 'Google AI API Key:' : 'OpenAI API Key:'}
            </label>
            <input
              type="password"
              value={localSettings.aiProvider.apiKey}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                aiProvider: {
                  ...localSettings.aiProvider,
                  apiKey: e.target.value
                }
              })}
              placeholder={localSettings.preferredProvider === 'gemini' 
                ? 'Enter your Google AI API key' 
                : 'Enter your OpenAI API key'
              }
            />
            <div className="api-help">
              {localSettings.preferredProvider === 'gemini' ? (
                <small>
                  Get your free API key at: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                  <br />✅ Free tier: 15 requests/minute, 1,500/day
                </small>
              ) : (
                <small>
                  Get your API key at: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
                  <br />💰 Paid: ~$0.002 per 1K tokens
                </small>
              )}
            </div>
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={localSettings.cacheEnabled}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  cacheEnabled: e.target.checked
                })}
              />
              Enable caching
            </label>
          </div>
          
          <div className="setting-group">
            <label>Cache expiry (days):</label>
            <input
              type="number"
              value={localSettings.cacheExpiry}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                cacheExpiry: parseInt(e.target.value)
              })}
              min="1"
              max="365"
            />
          </div>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={localSettings.showRedFlags}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  showRedFlags: e.target.checked
                })}
              />
              Show red flags
            </label>
          </div>
          
          <div className="settings-actions">
            <button 
              onClick={saveSettings}
              disabled={saving}
              className="save-btn"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button 
              onClick={clearCache}
              className="clear-cache-btn"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => { setError(null); loadData(); }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <div className="brand-text">
            <h2>WhatDidISign</h2>
            <span className="tagline">AI Legal Document Analyzer</span>
          </div>
        </div>
        <div className="header-status">
          {settings?.aiProvider.apiKey ? (
            <div className="status-indicator connected" title="API Connected">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          ) : (
            <div className="status-indicator disconnected" title="Setup Required">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          )}
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>Links</span>
          {links.length > 0 && <span className="tab-badge">{links.length}</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'summaries' ? 'active' : ''}`}
          onClick={() => setActiveTab('summaries')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Analysis</span>
          {summaries.length > 0 && <span className="tab-badge">{summaries.length}</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
          {isFirstTime && <span className="tab-notification"></span>}
        </button>
      </div>
      
      <div className="tab-container">
        {activeTab === 'links' && <LinksTab />}
        {activeTab === 'summaries' && <SummariesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

export default Popup;
