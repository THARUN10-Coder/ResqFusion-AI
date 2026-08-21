import React, { useEffect, useState } from 'react';
import { 
  Settings, Sliders, Cpu, Bell, Database, RefreshCw, 
  Shield, CheckCircle2, AlertCircle, Save, Info, Activity, Radio
} from 'lucide-react';
import { getHealthStatus } from '../services/api';

export const SettingsPage: React.FC = () => {
  // System Health
  const [health, setHealth] = useState<{
    status: string;
    project: string;
    version: string;
    ai_provider: string;
    ai_key_configured: boolean;
  } | null>(null);

  // AI Engine Settings
  const [aiProvider, setAiProvider] = useState<'mock' | 'openai' | 'gemini'>('mock');
  const [aiApiKey, setAiApiKey] = useState<string>('');

  // Priority Scoring Weights (Sliders)
  const [weights, setWeights] = useState({
    severity: 25,
    people: 20,
    medical: 20,
    resources: 15,
    confidence: 10,
    recency: 10,
  });

  // Source Reliability Weights
  const [sourceWeights, setSourceWeights] = useState({
    official: 95,
    agency: 92,
    verifiedCitizen: 82,
    unverifiedCitizen: 65,
    social: 50,
  });

  // Notifications & Operational Settings
  const [audioAlerts, setAudioAlerts] = useState<boolean>(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5);
  const [showConflictWarnings, setShowConflictWarnings] = useState<boolean>(true);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    getHealthStatus()
      .then((res) => {
        setHealth(res);
        if (res.ai_provider === 'openai' || res.ai_provider === 'gemini' || res.ai_provider === 'mock') {
          setAiProvider(res.ai_provider);
        }
      })
      .catch((err) => console.error('Failed to get health', err));
  }, []);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleSaveSettings = () => {
    // In demo environment, persist to localStorage
    localStorage.setItem('resqfusion_settings', JSON.stringify({
      aiProvider,
      weights,
      sourceWeights,
      audioAlerts,
      autoRefreshInterval,
      showConflictWarnings,
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setWeights({
      severity: 25,
      people: 20,
      medical: 20,
      resources: 15,
      confidence: 10,
      recency: 10,
    });
    setSourceWeights({
      official: 95,
      agency: 92,
      verifiedCitizen: 82,
      unverifiedCitizen: 65,
      social: 50,
    });
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        padding: '20px 24px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc'
          }}>
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              System & AI Engine Configuration
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Tune multi-criteria priority scoring algorithms, source reliability thresholds, and AI providers
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleResetDefaults}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} />
            Reset Defaults
          </button>

          <button
            onClick={handleSaveSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: '12px',
              background: savedSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: '1px solid rgba(139, 92, 246, 0.5)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            {savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {savedSuccess ? 'Configuration Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Section 1: AI Provider & Multimodal Extraction */}
        <div style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} style={{ color: '#60a5fa' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Intelligence & NLP Engine
            </h3>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5 }}>
            Configure how incoming emergency reports are parsed, filtered, and checked for contradictions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>AI Provider Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { id: 'mock', label: 'Local Deterministic', desc: 'Zero-Key Fast Offline Engine' },
                { id: 'gemini', label: 'Google Gemini', desc: 'Gemini 1.5 Flash / Pro' },
                { id: 'openai', label: 'OpenAI GPT-4o', desc: 'Vision & Multimodal' },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setAiProvider(p.id as any)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: aiProvider === p.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: aiProvider === p.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: aiProvider === p.id ? '#60a5fa' : '#fff' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px' }}>
                    {p.desc}
                  </div>
                </div>
              ))}
            </div>

            {aiProvider !== 'mock' && (
              <div style={{ marginTop: '6px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  {aiProvider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Health Box */}
          <div style={{
            marginTop: 'auto',
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} style={{ color: '#4ade80' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                  Backend Server Status: {health ? health.status.toUpperCase() : 'CONNECTING...'}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                  Platform Version {health?.version || '1.0.0'}
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              ONLINE
            </span>
          </div>
        </div>

        {/* Section 2: Priority Engine Multi-Factor Weights */}
        <div style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sliders size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                Priority Score Normalization Weights
              </h3>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              color: totalWeight === 100 ? '#4ade80' : '#f87171',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              Sum: {totalWeight}% {totalWeight === 100 ? '✓' : '(Target: 100%)'}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            Sliders adjust how much each dimension influences an incident's 0 – 100 rescue priority index.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'severity', label: 'Disaster Severity Rating', color: '#f87171' },
              { key: 'people', label: 'Trapped / Impacted People Count', color: '#fb923c' },
              { key: 'medical', label: 'Urgent Medical Need Signal', color: '#f43f5e' },
              { key: 'resources', label: 'Resource Criticality Demand', color: '#38bdf8' },
              { key: 'confidence', label: 'Multi-Source Confidence Score', color: '#4ade80' },
              { key: 'recency', label: 'Time Recency Decay Factor', color: '#c084fc' },
            ].map((item) => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 800 }}>{(weights as any)[item.key]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={(weights as any)[item.key]}
                  onChange={(e) => setWeights({ ...weights, [item.key]: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Source Reliability Calibration */}
        <div style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} style={{ color: '#10b981' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Source Reliability Calibration
            </h3>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
            Set baseline trust weights (0 – 100%) for incoming ground intelligence channels.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'official', label: 'Official Alerts (TNSDMA / NDMA / SACHET)', color: '#4ade80' },
              { key: 'agency', label: 'Emergency Agencies (Fire / Police / SDRF)', color: '#38bdf8' },
              { key: 'verifiedCitizen', label: 'Verified Citizen Reporters (With GPS & Photo)', color: '#c084fc' },
              { key: 'unverifiedCitizen', label: 'Unverified Anonymous Citizen Reports', color: '#facc15' },
              { key: 'social', label: 'Social Media Feeds (X, Telegram, News)', color: '#fb923c' },
            ].map((item) => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 800 }}>{(sourceWeights as any)[item.key]}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={(sourceWeights as any)[item.key]}
                  onChange={(e) => setSourceWeights({ ...sourceWeights, [item.key]: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Operational Preferences & Notification Settings */}
        <div style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} style={{ color: '#ec4899' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Command Center Audio & Dispatch Alerts
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Critical Emergency Alarms</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Play siren sound on priority &gt; 90 or high fatality reports</div>
              </div>
              <input
                type="checkbox"
                checked={audioAlerts}
                onChange={(e) => setAudioAlerts(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ec4899', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Contradiction Warning Banners</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Display ⚠ CONFLICT DETECTED warning strips on contradictory reports</div>
              </div>
              <input
                type="checkbox"
                checked={showConflictWarnings}
                onChange={(e) => setShowConflictWarnings(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ec4899', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>WebSocket Auto-Sync Polling Interval</span>
                <span style={{ color: '#ec4899', fontWeight: 800 }}>{autoRefreshInterval}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
