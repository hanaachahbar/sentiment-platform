// src/pages/Settings.jsx
import React, { useState } from 'react';
import {
  Save, RefreshCw, Brain, Clock, BarChart2, History,
  TrendingUp, Calendar, CheckCircle, AlertCircle, ChevronDown,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const MOCK_HISTORY = [
  { date: '2026-04-20', accuracy: 0.923, f1: 0.911, duration: '4m 12s', status: 'success' },
  { date: '2026-04-13', accuracy: 0.908, f1: 0.895, duration: '4m 38s', status: 'success' },
  { date: '2026-04-06', accuracy: 0.891, f1: 0.876, duration: '5m 01s', status: 'success' },
  { date: '2026-03-30', accuracy: 0.879, f1: 0.861, duration: '4m 55s', status: 'success' },
  { date: '2026-03-23', accuracy: 0.854, f1: 0.840, duration: '6m 22s', status: 'failed' },
];

function Toast({ message, onClose }) {
  return (
    <div className="settings-toast stun-item">
      <CheckCircle size={18} style={{ color: '#10b981', marginRight: '10px', flexShrink: 0 }} />
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '0 4px' }}>✕</button>
    </div>
  );
}

function SettingsSection({ icon, title, subtitle, children }) {
  return (
    <div className="settings-section glass-panel stun-item">
      <div className="settings-section-header">
        <div className="settings-section-icon">{icon}</div>
        <div>
          <h3 className="settings-section-title">{title}</h3>
          {subtitle && <p className="settings-section-sub text-fade">{subtitle}</p>}
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

export default function Settings() {
  const [toast, setToast] = useState(null);
  const [retraining, setRetraining] = useState(false);

  // SLA config
  const [slaHours, setSlaHours] = useState(48);

  // Model settings
  const [retrainInterval, setRetrainInterval] = useState('Weekly');

  // Trend period
  const [trendPeriod, setTrendPeriod] = useState('last_week');
  const [trendCustomStart, setTrendCustomStart] = useState('');
  const [trendCustomEnd, setTrendCustomEnd] = useState('');

  // Dashboard default time
  const [dashDefaultTime, setDashDefaultTime] = useState('This Week');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = (section) => {
    showToast(`${section} settings saved successfully.`);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    await new Promise(r => setTimeout(r, 2200));
    setRetraining(false);
    showToast('Model retraining triggered. Results will appear in Training History.');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container fade-in-up">

        {/* Header */}
        <div className="feed-header mb-8 stun-item">
          <div className="feed-header-content">
            <img src={logoImg} alt="Logo" className="feed-logo" />
            <div className="feed-title-section">
              <h1 className="feed-title text-primary" style={{ fontSize: '36px' }}>Settings</h1>
              <p className="section-sub text-fade mt-2" style={{ fontSize: '18px' }}>
                Configure platform behaviour, model retraining, SLA thresholds, and time ranges.
              </p>
            </div>
          </div>
        </div>

        <div className="settings-grid">

          {/* SLA Configuration */}
          <SettingsSection
            icon={<Clock size={22} style={{ color: '#eab308' }} />}
            title="SLA Configuration"
            subtitle="Set the maximum response time before a ticket is considered breached."
          >
            <div className="settings-field-row">
              <label className="settings-label">SLA Response Time (hours)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="number"
                  className="settings-input"
                  min={1} max={720}
                  value={slaHours}
                  onChange={e => setSlaHours(Number(e.target.value))}
                  style={{ width: '120px' }}
                />
                <span className="text-fade" style={{ fontSize: '14px' }}>hours ({(slaHours / 24).toFixed(1)} days)</span>
              </div>
            </div>
            <div className="settings-field-row">
              <label className="settings-label">Current SLA Target</label>
              <div className="settings-badge-value" style={{ color: '#eab308' }}>{slaHours}h</div>
            </div>
            <button className="settings-save-btn hover-lift-shadow" onClick={() => handleSave('SLA')}>
              <Save size={16} style={{ marginRight: '8px' }} /> Save SLA Settings
            </button>
          </SettingsSection>

          {/* Model Settings */}
          <SettingsSection
            icon={<Brain size={22} style={{ color: 'var(--brand-blue)' }} />}
            title="Model Settings"
            subtitle="Control retraining schedule and trigger manual retraining."
          >
            <div className="settings-field-row">
              <label className="settings-label">Retraining Interval</label>
              <select
                className="sophisticated-select"
                value={retrainInterval}
                onChange={e => setRetrainInterval(e.target.value)}
                style={{ minWidth: '160px' }}
              >
                <option>Daily</option>
                <option>Weekly</option>
                <option>Bi-Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="settings-field-row">
              <label className="settings-label">Next Scheduled Retraining</label>
              <div className="settings-badge-value" style={{ color: 'var(--brand-blue)' }}>
                {retrainInterval === 'Daily' ? 'Tomorrow 02:00' : retrainInterval === 'Weekly' ? 'Mon 02:00' : retrainInterval === 'Bi-Weekly' ? 'In 11 days' : 'In 26 days'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="settings-save-btn hover-lift-shadow" onClick={() => handleSave('Model')}>
                <Save size={16} style={{ marginRight: '8px' }} /> Save Schedule
              </button>
              <button
                className="settings-retrain-btn hover-lift-shadow"
                onClick={handleRetrain}
                disabled={retraining}
              >
                <RefreshCw size={16} style={{ marginRight: '8px', animation: retraining ? 'spin 1s linear infinite' : 'none' }} />
                {retraining ? 'Retraining...' : 'Retrain Now'}
              </button>
            </div>
          </SettingsSection>

          {/* Model Performance */}
          <SettingsSection
            icon={<BarChart2 size={22} style={{ color: '#10b981' }} />}
            title="Current Model Performance"
            subtitle="Accuracy and F1 Score for the currently deployed classification model."
          >
            <div className="settings-metrics-row">
              <div className="settings-metric-card" style={{ borderColor: '#10b981' }}>
                <span className="settings-metric-label">Accuracy</span>
                <span className="settings-metric-value" style={{ color: '#10b981' }}>92.3%</span>
                <span className="settings-metric-sub text-fade">on validation set</span>
              </div>
              <div className="settings-metric-card" style={{ borderColor: 'var(--brand-blue)' }}>
                <span className="settings-metric-label">F1 Score</span>
                <span className="settings-metric-value" style={{ color: 'var(--brand-blue)' }}>0.911</span>
                <span className="settings-metric-sub text-fade">macro-averaged</span>
              </div>
              <div className="settings-metric-card" style={{ borderColor: '#eab308' }}>
                <span className="settings-metric-label">Last Trained</span>
                <span className="settings-metric-value" style={{ color: '#eab308', fontSize: '22px' }}>Apr 20</span>
                <span className="settings-metric-sub text-fade">2026</span>
              </div>
            </div>
          </SettingsSection>

          {/* Training History */}
          <SettingsSection
            icon={<History size={22} style={{ color: '#8b5cf6' }} />}
            title="Training History"
            subtitle="Log of all previous model training runs."
          >
            <div className="settings-history-table">
              <div className="settings-history-header">
                <span>Date</span>
                <span>Accuracy</span>
                <span>F1 Score</span>
                <span>Duration</span>
                <span>Status</span>
              </div>
              {MOCK_HISTORY.map((run, i) => (
                <div className="settings-history-row" key={i}>
                  <span>{run.date}</span>
                  <span style={{ color: '#10b981' }}>{(run.accuracy * 100).toFixed(1)}%</span>
                  <span style={{ color: 'var(--brand-blue)' }}>{run.f1.toFixed(3)}</span>
                  <span className="text-fade">{run.duration}</span>
                  <span>
                    {run.status === 'success'
                      ? <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Success</span>
                      : <span style={{ color: '#e11d48', fontWeight: 700 }}>✕ Failed</span>
                    }
                  </span>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* Trend Extraction Period */}
          <SettingsSection
            icon={<TrendingUp size={22} style={{ color: '#ec4899' }} />}
            title="Trend Extraction Period"
            subtitle="Specify the time window used to extract and detect trends."
          >
            <div className="settings-field-row">
              <label className="settings-label">Extract Trends For</label>
              <select
                className="sophisticated-select"
                value={trendPeriod}
                onChange={e => { setTrendPeriod(e.target.value); setTrendCustomStart(''); setTrendCustomEnd(''); }}
                style={{ minWidth: '180px' }}
              >
                <option value="last_week">Last Week</option>
                <option value="last_2weeks">Last 2 Weeks</option>
                <option value="last_month">Last Month</option>
                <option value="last_3months">Last 3 Months</option>
                <option value="custom">Custom Period</option>
              </select>
            </div>
            {trendPeriod === 'custom' && (
              <div className="settings-custom-dates">
                <div className="settings-field-row">
                  <label className="settings-label">Start Date</label>
                  <input type="date" className="settings-input" max={todayStr} value={trendCustomStart} onChange={e => setTrendCustomStart(e.target.value)} />
                </div>
                <div className="settings-field-row">
                  <label className="settings-label">End Date</label>
                  <input type="date" className="settings-input" max={todayStr} value={trendCustomEnd} onChange={e => setTrendCustomEnd(e.target.value)} />
                </div>
              </div>
            )}
            <button className="settings-save-btn hover-lift-shadow" onClick={() => handleSave('Trend Period')}>
              <Save size={16} style={{ marginRight: '8px' }} /> Apply Period
            </button>
          </SettingsSection>

          {/* Dashboard Default Time Range */}
          <SettingsSection
            icon={<Calendar size={22} style={{ color: 'var(--color-3)' }} />}
            title="Dashboard Default Time Range"
            subtitle="The default time window shown on the Dashboard KPI boxes when you first open the app."
          >
            <div className="settings-field-row">
              <label className="settings-label">Default Range</label>
              <select
                className="sophisticated-select"
                value={dashDefaultTime}
                onChange={e => setDashDefaultTime(e.target.value)}
                style={{ minWidth: '180px' }}
              >
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last 3 Months</option>
              </select>
            </div>
            <div className="settings-field-row">
              <label className="settings-label">Currently Active</label>
              <div className="settings-badge-value" style={{ color: 'var(--color-3)' }}>{dashDefaultTime}</div>
            </div>
            <button className="settings-save-btn hover-lift-shadow" onClick={() => handleSave('Dashboard Time Range')}>
              <Save size={16} style={{ marginRight: '8px' }} /> Save Default
            </button>
          </SettingsSection>

        </div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
