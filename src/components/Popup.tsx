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
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Use default settings if we can't load from background
        setSettings({
          enabled: true,
          preferredProvider: 'gemini',
          aiProvider: {
            name: 'Google Gemini',
            apiKey: '',
            model: 'gemini-pro',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
            costPer1K: 0,
            provider: 'gemini'
          },
          cacheEnabled: true,
          cacheExpiry: 30,
          showRedFlags: true,
          riskThreshold: 0.7,
          uiMode: 'popup' as const,
          notifications: true
        });
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
      <div className="header">
        <h3>Detected Links</h3>
        <span className="count">{links.length} found</span>
      </div>
      
      {links.length === 0 ? (
        <div className="empty-state">
          <p>No Terms & Conditions or Privacy Policy links detected on this page.</p>
          <button onClick={loadData} className="refresh-btn">
            Refresh
          </button>
        </div>
      ) : (
        <div className="links-list">
          {links.map((link, index) => (
            <div key={index} className="link-item">
              <div className="link-info">
                <div className="link-type">{link.type.toUpperCase()}</div>
                <div className="link-text">{link.text}</div>
                <div className="link-url">{link.url}</div>
                <div className="confidence">
                  Confidence: {Math.round(link.confidence * 100)}%
                </div>
              </div>
              <button 
                onClick={() => handleSummarize(link)}
                disabled={loading}
                className="summarize-btn"
              >
                {loading ? 'Analyzing...' : 'Summarize'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SummariesTab = () => (
    <div className="tab-content">
      <div className="header">
        <h3>Summaries</h3>
        <span className="count">{summaries.length} generated</span>
      </div>
      
      {summaries.length === 0 ? (
        <div className="empty-state">
          <p>No summaries generated yet. Click "Summarize" on any detected link.</p>
        </div>
      ) : (
        <div className="summaries-list">
          {summaries.map((summary, index) => (
            <div key={index} className="summary-item">
              <div className="summary-header">
                <h4>{summary.title}</h4>
                <div 
                  className="risk-badge"
                  style={{ backgroundColor: getRiskColor(summary.riskScore) }}
                >
                  {getRiskLabel(summary.riskScore)}
                </div>
              </div>
              
              <div className="summary-content">
                <div className="section">
                  <h5>Key Points</h5>
                  <ul>
                    {summary.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                
                {summary.redFlags.length > 0 && (
                  <div className="section">
                    <h5>Red Flags ⚠️</h5>
                    {summary.redFlags.map((flag, i) => (
                      <div key={i} className={`red-flag ${flag.severity}`}>
                        <strong>{flag.type}:</strong> {flag.description}
                        {flag.quote && <blockquote>"{flag.quote}"</blockquote>}
                      </div>
                    ))}
                  </div>
                )}
                
                {summary.dataRights.length > 0 && (
                  <div className="section">
                    <h5>Your Data Rights</h5>
                    {summary.dataRights.map((right, i) => (
                      <div key={i} className="data-right">
                        <strong>{right.type}:</strong> {right.description}
                        {right.available && (
                          <div className="process">How to: {right.process}</div>
                        )}
                      </div>
                    ))}
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
        <h2>WhatDidISign</h2>
        <div className="version">v1.0.0</div>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'links' ? 'active' : ''}
          onClick={() => setActiveTab('links')}
        >
          Links ({links.length})
        </button>
        <button 
          className={activeTab === 'summaries' ? 'active' : ''}
          onClick={() => setActiveTab('summaries')}
        >
          Summaries ({summaries.length})
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
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
