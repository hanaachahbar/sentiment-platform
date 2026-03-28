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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container modern-bg">
      {/* Sidebar */}
      <aside className="sidebar glass-sidebar">
        <div className="brand">
          <div className="brand-icon pulse-brand">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
               <circle cx="12" cy="14" r="4" fill="var(--brand-green)"/>
             </svg>
          </div>
          <div className="brand-text">
            <h2>TelecomSight</h2>
            <p>INTELLIGENCE SUITE</p>
          </div>
        </div>

        <nav className="nav-menu">
          <a href="#" className={`nav-item hover-lift ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={18} className="nav-icon" />
            Dashboard
          </a>
          <a href="#" className={`nav-item hover-lift ${activeTab === 'feed' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('feed'); }}>
            <MessageSquare size={18} className="nav-icon" />
            Feed
          </a>
          <a href="#" className="nav-item hover-lift">
            <TrendingUp size={18} className="nav-icon" />
            Trends
          </a>
          <a href="#" className="nav-item hover-lift">
            <Settings size={18} className="nav-icon" />
            Settings
          </a>
        </nav>

        <div className="analysis-capacity">
          <span className="capacity-label">ANALYSIS CAPACITY</span>
          <div className="progress-bar glow-bar">
            <div className="progress-fill shimmer-effect"></div>
          </div>
          <button className="new-analysis-btn hover-glow-btn text-gradient">New Analysis</button>
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
