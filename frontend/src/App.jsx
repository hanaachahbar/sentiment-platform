import React, { useState } from 'react';
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTrendId, setSelectedTrendId] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const navigateToTrend = (trendId) => {
    setSelectedTrendId(trendId);
    setActiveTab('trends');
  };

  const navigateToSLAAlerts = () => {
    setActiveTab('slaAlerts');
  };

  const navigateToDashboard = () => {
    setActiveTab('dashboard');
  };

  const navigateToFeed = (ticketId) => {
    setSelectedTicketId(ticketId);
    setActiveTab('feed');
  };

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
          <a href="#" className={`nav-item hover-lift ${activeTab === 'slaAlerts' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('slaAlerts'); }}>
            <AlertCircle size={20} className="nav-icon" />
            SLA Alerts
          </a>
          <a href="#" className="nav-item hover-lift">
            <Settings size={20} className="nav-icon" />
            Settings
          </a>
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
        {activeTab === 'dashboard' && <Dashboard onNavigateToTrend={navigateToTrend} onNavigateToSLAAlerts={navigateToSLAAlerts} />}
        {activeTab === 'feed' && <Feed selectedTicketId={selectedTicketId} />}
        {activeTab === 'trends' && (
          <Trends 
            initialTrendId={selectedTrendId} 
            onClearInitialTrend={() => setSelectedTrendId(null)} 
          />
        )}
        {activeTab === 'slaAlerts' && <SLAAlerts onNavigateToDashboard={navigateToDashboard} onNavigateToFeed={navigateToFeed} />}
      </main>
    </div>
  );
}

export default App;
