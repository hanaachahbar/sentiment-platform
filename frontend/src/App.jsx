import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  Settings
} from 'lucide-react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Trends from './pages/Trends';
import SLAAlerts from './pages/SLAAlerts';
import logoImg from './assets/logo.png';
import { fetchFetcherStatus } from './api';

function formatCountdown(nextRunAt, nowMs) {
  if (!nextRunAt) return '--:--';

  const runAtMs = new Date(nextRunAt).getTime();
  if (Number.isNaN(runAtMs)) return '--:--';

  const remainingSeconds = Math.max(0, Math.floor((runAtMs - nowMs) / 1000));
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function formatTimestamp(value) {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleString();
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTrendId, setSelectedTrendId] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [fetcherStatus, setFetcherStatus] = useState(null);
  const [fetcherStatusError, setFetcherStatusError] = useState('');
  const [countdownNowMs, setCountdownNowMs] = useState(Date.now());

  const handleNavigateToTrend = (trendId) => {
    setSelectedTrendId(trendId || null);
    setActiveTab('trends');
  };

  const handleClearInitialTrend = () => {
    setSelectedTrendId(null);
  };

  const handleNavigateToSLAAlerts = () => {
    setActiveTab('sla-alerts');
  };

  const handleNavigateToFeed = (ticketId) => {
    setSelectedTicketId(ticketId || null);
    setActiveTab('feed');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFetcherStatus = async () => {
      try {
        const data = await fetchFetcherStatus();
        if (!isMounted) return;

        setFetcherStatus(data);
        setFetcherStatusError('');
      } catch (error) {
        if (!isMounted) return;
        setFetcherStatusError(error.message || 'Fetcher monitor unavailable');
      }
    };

    loadFetcherStatus();
    const poll = setInterval(loadFetcherStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(poll);
    };
  }, []);

  const fetcherState = fetcherStatus?.status || 'idle';
  const countdown = formatCountdown(fetcherStatus?.next_run_at, countdownNowMs);
  const lastSuccess = formatTimestamp(fetcherStatus?.last_success_at);
  const lastInsertedCount = fetcherStatus?.last_inserted_count ?? 0;

  return (
    <div className="app-container modern-bg">
      {/* Sidebar */}
      <aside className="sidebar glass-sidebar">
        <div className="brand">
          <div className="brand-logo">
            <img src={logoImg} alt="Algérie Télécom Logo" className="logo-img" />
          </div>
          <div className="brand-text">
            <h2 className="brand-title">ALGÉRIE TÉLÉCOM</h2>
            <p className="brand-subtitle">ANALYTICS INTELLIGENCE</p>
          </div>
        </div>

        <nav className="nav-menu">
          <a href="#" className={`nav-item hover-lift ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={20} className="nav-icon" />
            Dashboard
          </a>
          <a href="#" className={`nav-item hover-lift ${activeTab === 'feed' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('feed'); }}>
            <MessageSquare size={20} className="nav-icon" />
            Feed
          </a>
          <a href="#" className={`nav-item hover-lift ${activeTab === 'trends' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trends'); }}>
            <TrendingUp size={20} className="nav-icon" />
            Trends
          </a>
          <a href="#" className={`nav-item hover-lift ${activeTab === 'sla-alerts' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('sla-alerts'); }}>
            <AlertCircle size={20} className="nav-icon" />
            SLA Alerts
          </a>
          <a href="#" className="nav-item hover-lift">
            <Settings size={20} className="nav-icon" />
            Settings
          </a>

          <div className="fetcher-monitor-card">
            <div className="fetcher-monitor-header">
              <span className="fetcher-monitor-title">Fetcher Monitor</span>
              <span className={`fetcher-status-pill ${fetcherState}`}>{fetcherState}</span>
            </div>

            <div className="fetcher-countdown">{countdown}</div>
            <div className="fetcher-countdown-label">Next scheduled run</div>

            <div className="fetcher-meta-row">
              <span>Last success</span>
              <strong>{lastSuccess}</strong>
            </div>

            <div className="fetcher-meta-row">
              <span>Last inserted</span>
              <strong>{lastInsertedCount}</strong>
            </div>

            {fetcherStatusError && (
              <div className="fetcher-error-text">{fetcherStatusError}</div>
            )}

            {!fetcherStatusError && fetcherStatus?.last_error && fetcherState === 'failed' && (
              <div className="fetcher-error-text">{fetcherStatus.last_error}</div>
            )}
          </div>
        </nav>

        <div className="analysis-capacity">
          <span className="capacity-label">ANALYSIS CAPACITY</span>
          <div className="progress-bar glow-bar">
            <div className="progress-fill shimmer-effect"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigateToTrend={handleNavigateToTrend}
            onNavigateToSLAAlerts={handleNavigateToSLAAlerts}
          />
        )}
        {activeTab === 'feed' && <Feed selectedTicketId={selectedTicketId} />}
        {activeTab === 'trends' && (
          <Trends
            initialTrendId={selectedTrendId}
            onClearInitialTrend={handleClearInitialTrend}
          />
        )}
        {activeTab === 'sla-alerts' && (
          <SLAAlerts
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToFeed={handleNavigateToFeed}
          />
        )}
      </main>
    </div>
  );
}

export default App;
