import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  TrendingUp, 
  Settings
} from 'lucide-react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import logoImg from './assets/logo.png';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
          <a href="#" className="nav-item hover-lift">
            <TrendingUp size={20} className="nav-icon" />
            Trends
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
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'feed' && <Feed />}
      </main>
    </div>
  );
}

export default App;
