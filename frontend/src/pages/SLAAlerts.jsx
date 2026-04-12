// src/pages/SLAAlerts.jsx
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Search,
  HelpCircle,
  Bell,
  ArrowLeft,
  Loader
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { fetchPosts } from '../api';

// Format absolute seconds into human-readable string with days, hours, minutes, seconds
function formatDuration(seconds) {
  if (seconds === 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Compute SLA remaining time from sla_deadline (returns human-readable duration without minus sign)
function computeSLA(slaDeadline) {
  if (!slaDeadline) return { totalSeconds: 0, displayTime: '—', isBreach: false, isAtRisk: false };
  
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diffMs = deadline - now;
  const totalSeconds = Math.floor(diffMs / 1000);
  const isNegative = diffMs < 0;
  const absSeconds = Math.abs(totalSeconds);
  
  return {
    totalSeconds,            // signed, used for sorting (most urgent first)
    displayTime: formatDuration(absSeconds),
    isBreach: isNegative,
    isAtRisk: !isNegative && totalSeconds < 3600, // Less than 1 hour remaining
  };
}

export default function SLAAlerts({ onNavigateToFeed }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPosts();
        
        const slaAlerts = data
          .filter(t => t.status === 'open' || t.status === 'breached')
          .map(t => {
            const sla = computeSLA(t.sla_deadline);
            return {
              id: t.id,
              author: t.author || 'Unknown',
              text: t.text,
              platform: t.platform,
              status: t.status,
              sla_deadline: t.sla_deadline,
              ...sla,
            };
          })
          .sort((a, b) => a.totalSeconds - b.totalSeconds); // Most urgent first (negative = overdue)

        setAlerts(slaAlerts);
      } catch (err) {
        console.error('SLA Alerts load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const breachedCount = alerts.filter(a => a.isBreach).length;
  const atRiskCount = alerts.filter(a => a.isAtRisk).length;

  if (loading) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <Loader size={48} style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading SLA alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#e11d48' }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Failed to load SLA alerts</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header className="header glass-effect">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search alerts..." />
        </div>
        <div className="header-actions">
          <button className="icon-btn hover-glow text-primary">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>
          <button className="icon-btn hover-glow text-primary">
            <HelpCircle size={20} />
          </button>
          <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="profile-avatar border-glow" />
        </div>
      </header>

      <div className="dashboard-container fade-in-up">
        {/* Header - Aligned with Feed.jsx */}
        <div className="feed-header mb-8 stun-item">
          <div className="feed-header-content" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <img src={logoImg} alt="SLA Alerts Logo" className="feed-logo" />
            <div className="feed-title-section" style={{flex: 1}}>
              <h1 className="feed-title text-primary" style={{ fontSize: '36px' }}>SLA Alerts</h1>
              <p className="section-sub text-fade mt-2" style={{ fontSize: '18px' }}>Monitor open tickets approaching or exceeding 48-hour SLA deadline.</p>
            </div>
          </div>
        </div>

        {/* SLA Statistics Cards */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px'}}>
          <div className="card glass-panel stun-item" style={{borderTop: '3px solid #e11d48', textAlign: 'center', padding: '24px', animationDelay: '0.1s'}}>
            <p style={{fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: '600'}}>Total Alerts</p>
            <p style={{fontSize: '40px', fontWeight: '700', color: '#e11d48'}}>{alerts.length}</p>
          </div>
          <div className="card glass-panel stun-item" style={{borderTop: '3px solid #f59e0b', textAlign: 'center', padding: '24px', animationDelay: '0.2s'}}>
            <p style={{fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: '600'}}>At Risk</p>
            <p style={{fontSize: '40px', fontWeight: '700', color: '#f59e0b'}}>{atRiskCount}</p>
          </div>
          <div className="card glass-panel stun-item" style={{borderTop: '3px solid #e11d48', textAlign: 'center', padding: '24px', animationDelay: '0.3s'}}>
            <p style={{fontSize: '18px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: '600'}}>Breached</p>
            <p style={{fontSize: '40px', fontWeight: '700', color: '#e11d48'}}>{breachedCount}</p>
          </div>
        </div>

        {/* SLA Alerts List */}
        <div className="card glass-panel stun-item">
          <div className="card-header" style={{paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)'}}>
            <h3 className="section-heading" style={{fontSize: '24px'}}>Open Tickets</h3>
            <p className="section-sub text-fade" style={{fontSize: '16px'}}>Sorted by least time remaining</p>
          </div>
          
          <div style={{padding: '24px'}}>
            {alerts.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {/* Header Row */}
                <div style={{display: 'grid', gridTemplateColumns: '200px 1fr 150px 120px 1fr', gap: '16px', padding: '12px 16px', fontWeight: '700', fontSize: '16px', color: 'rgba(255, 255, 255, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '8px'}}>
                  <div>Customer Name</div>
                  <div>Time Remaining</div>
                  <div>Status</div>
                  <div></div>
                  <div>Action</div>
                </div>

                {/* Alert Rows */}
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    style={{
                      display: 'grid', 
                      gridTemplateColumns: '200px 1fr 150px 120px 1fr',
                      gap: '16px', 
                      padding: '16px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '8px', 
                      border: `1px solid ${alert.isBreach ? 'rgba(225, 29, 72, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                      alignItems: 'center',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                  >
                    {/* Customer Name */}
                    <span style={{fontSize: '18px', fontWeight: '700', color: 'white'}}>{alert.author}</span>
                    
                    {/* Time Remaining (now without minus sign, showing days when applicable) */}
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: alert.isBreach ? '#e11d48' : '#f59e0b', fontWeight: '700', fontSize: '18px'}}>
                      <Clock size={20} />
                      {alert.displayTime}
                    </div>
                    
                    {/* Status Pill */}
                    <span style={{
                      fontSize: '16px', 
                      fontWeight: '700', 
                      padding: '6px 12px', 
                      borderRadius: '4px', 
                      background: alert.isBreach ? 'rgba(225, 29, 72, 0.3)' : 'rgba(245, 158, 11, 0.3)', 
                      color: alert.isBreach ? '#e11d48' : '#f59e0b',
                      width: 'fit-content',
                      textAlign: 'center'
                    }}>
                      {alert.isBreach ? '🔴 Breached' : '🟠 At Risk'}
                    </span>

                    <div></div>
                    
                    {/* Go to Ticket Link */}
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigateToFeed(alert.id);
                      }}
                      style={{
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: 'var(--brand-blue)', 
                        textDecoration: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#60a5fa';
                        e.currentTarget.style.gap = '12px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--brand-blue)';
                        e.currentTarget.style.gap = '8px';
                      }}
                    >
                      Go to ticket
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '48px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '20px'}}>
                No SLA alerts at this time ✓
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}