// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp,
  Search,
  HelpCircle,
  Bell,
  ArrowRight,
  TrendingDown,
  Sparkles,
  AlertCircle,
  Loader
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { 
  LineChart, 
  Line, 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import { fetchPosts, fetchStats, fetchTrends } from '../api';

// Color palette for categories
const CATEGORY_COLORS = [
  'var(--color-1)',  // Blue
  'var(--color-2)',  // Green
  'var(--color-3)',  // Muted Blue
  'var(--color-5)',  // Muted Green
  'var(--color-4)',  // Accent
  '#e11d48',         // Red
  '#eab308',         // Yellow
  '#8b5cf6',         // Purple
];

const TREND_COLORS = ['#3b82f6', '#0f5132', '#10b981', '#64748b', '#e11d48', '#eab308'];

// --- COMPONENT ---
export default function Dashboard({ onNavigateToTrend, onNavigateToSLAAlerts }) {
  const [activeIndex, setActiveIndex] = useState(1);

  // API state
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data on mount
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, postsData, trendsData] = await Promise.all([
          fetchStats(),
          fetchPosts(),
          fetchTrends(),
        ]);
        setStats(statsData);
        setPosts(postsData);
        setTrends(trendsData.trends || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // --- COMPUTED DATA ---

  // KPI: Open tickets count
  const openTickets = posts.filter(p => p.status === 'open').length;

  // KPI: SLA breach rate
  const totalTickets = posts.length;
  const breachedTickets = posts.filter(p => p.status === 'breached').length;
  const slaBreachRate = totalTickets > 0 ? ((breachedTickets / totalTickets) * 100).toFixed(1) : '0.0';

  // KPI: Avg response time (for resolved tickets, hours between created_at and now)
  const resolvedTickets = posts.filter(p => p.status === 'resolved' && p.created_at);
  const avgResponseHours = resolvedTickets.length > 0
    ? (resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.created_at);
        const now = new Date();
        return sum + (now - created) / (1000 * 60 * 60);
      }, 0) / resolvedTickets.length).toFixed(1)
    : '—';

  // Daily Activity Flow — group posts by date
  const activityData = (() => {
    const counts = {};
    posts.forEach(p => {
      if (!p.created_at) return;
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, volume]) => ({ name, volume }))
      .slice(-7); // last 7 days
  })();

  // Category distribution for donut chart
  const categoryData = (() => {
    const counts = {};
    posts.forEach(p => {
      // Normalize to lowercase to avoid duplicates like "Negative" vs "negative"
      const cat = (p.category || 'unknown').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Map to display names and colors
    return Object.entries(counts).map(([name, value], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize for display
      value,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  })();

  const categoryTotal = categoryData.reduce((sum, c) => sum + c.value, 0);

  // Sparkline data from posts (group by recent days for each KPI)
  const buildSparkline = (filterFn) => {
    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toDateString()] = 0;
    }
    posts.filter(filterFn).forEach(p => {
      if (!p.created_at) return;
      const key = new Date(p.created_at).toDateString();
      if (key in days) days[key]++;
    });
    return Object.values(days).map(v => ({ v }));
  };

  const spark1 = buildSparkline(() => true); // all mentions
  const spark2 = buildSparkline(p => p.status === 'open'); // open tickets
  const spark3 = buildSparkline(p => p.status === 'resolved'); // resolved
  const spark4 = buildSparkline(p => p.status === 'breached'); // breached

  // Trend cards — map from API response
  const trendCards = trends.slice(0, 4).map((t, i) => ({
    id: t.topic || `trend-${i}`,
    name: t.topic || 'Unknown Topic',
    desc: `${t.count} mentions · ${t.change}`,
    color: TREND_COLORS[i % TREND_COLORS.length],
  }));

  // Custom active shape for the Donut Chart (pop-out effect)
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    return (
      <g>
        <filter id={`glow-${payload.name.replace(/\s+/g, '')}`}>
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor={fill} floodOpacity="0.5"/>
        </filter>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          filter={`url(#glow-${payload.name.replace(/\s+/g, '')})`}
        />
      </g>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <Loader size={48} className="spin-animation" style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#e11d48' }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Failed to load dashboard</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>Make sure the backend is running at http://127.0.0.1:8000</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header className="header glass-effect">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search signals..." />
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
        {/* Welcome Section */}
        <div className="welcome-banner glass-panel stun-item mb-8">
          <div className="welcome-content">
            <div className="welcome-text-section">
              <div className="welcome-header">
                <img src={logoImg} alt="TelecomSight Logo" className="welcome-logo-img" />
                <h1 className="welcome-title">TelecomSight</h1>
              </div>
              <p className="welcome-subtitle">
                Real-time customer sentiment analysis and intelligence platform. Monitor social media conversations, detect emerging issues instantly, and make data-driven decisions with AI-powered insights. Stay ahead of customer needs and market trends.
              </p>
            </div>
            <div className="welcome-visual">
               <div className="glow-sphere blue-glow"></div>
               <div className="glow-sphere green-glow"></div>
            </div>
          </div>
        </div>

        {/* KPI Cards (Sparkline Style) */}
        <div className="kpi-spark-grid mb-8">
          
          {/* Total Mentions Today */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.1s', borderLeft: '4px solid var(--color-1)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Total Mentions <span className="text-fade">/ Today</span></span>
              <div className="kpi-spark-value">{stats?.total_posts_today?.toLocaleString() || '0'}</div>
              <div className="kpi-spark-status" style={{color: 'var(--color-1)'}}>
                <TrendingUp size={14} /> {totalTickets.toLocaleString()} total
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark1}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-1)" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="var(--color-1)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="var(--color-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-1)" }} activeDot={false} fill="url(#grad1)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Open Tickets */}
          <div className="kpi-spark-card glass-panel stun-item" style={{animationDelay: '0.2s', borderLeft: '4px solid #e11d48'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Open Tickets <span className="text-fade">/ Unresolved</span></span>
              <div className="kpi-spark-value" style={{color: '#e11d48'}}>{openTickets}</div>
              <div className="kpi-spark-status" style={{color: '#e11d48'}}>
                <TrendingUp size={14} /> {breachedTickets} breached
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark2}>
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="#e11d48" strokeWidth={2} dot={{ r: 3, fill: "#e11d48" }} activeDot={false} fill="url(#grad2)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg. Response Time */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.3s', borderLeft: '4px solid var(--color-3)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Avg. Response <span className="text-fade">/ Time</span></span>
              <div className="kpi-spark-value">{avgResponseHours === '—' ? '—' : `${avgResponseHours} hr`}</div>
              <div className="kpi-spark-status" style={{color: 'var(--brand-green)'}}>
                <TrendingDown size={14} /> across {resolvedTickets.length} resolved
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark3}>
                  <defs>
                    <linearGradient id="grad3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-3)" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="var(--color-3)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="var(--color-3)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-3)" }} activeDot={false} fill="url(#grad3)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* SLA Breach Rate */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.4s', borderLeft: '4px solid #eab308'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">SLA Breach Rate <span className="text-fade">/ 48h</span></span>
              <div className="kpi-spark-value" style={{color: '#eab308'}}>{slaBreachRate}%</div>
              <div className="kpi-spark-status" style={{color: '#e11d48'}}>
                <AlertCircle size={14} /> {stats?.sla_breaches || 0} breaches total
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark4}>
                  <defs>
                    <linearGradient id="grad4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#eab308" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: "#eab308" }} activeDot={false} fill="url(#grad4)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* --- Daily Flow Graph --- */}
        <div className="card glass-panel hover-shadow mb-8 stun-item" style={{animationDelay: '0.5s'}}>
          <div className="card-header pb-0">
            <div className="card-title">
              <h3 className="section-heading">Daily Activity Flow</h3>
              <p className="section-sub text-fade mt-2">Volume of ticket activity grouped by day.</p>
            </div>
            <div className="card-action">
              <span className="volume-indicator pulse-animation" style={{backgroundColor: 'var(--color-2)'}}></span> LIVE
            </div>
          </div>
          <div className="chart-container" style={{height: '240px', marginTop: '20px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorVolumeFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-1)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-1)" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="shadowMain" height="200%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="var(--color-1)" floodOpacity="0.4"/>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', backgroundColor: 'var(--bg-surface)' }}
                  cursor={{ stroke: 'var(--color-3)', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="var(--color-1)" 
                  strokeWidth={4}
                  dot={{ r: 5, fill: 'var(--bg-surface)', stroke: 'var(--color-1)', strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: 'var(--color-1)', stroke: 'white', strokeWidth: 3 }}
                  filter="url(#shadowMain)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-grid-alt mb-8">
          
          {/* Donut Chart Style */}
          <div className="card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.6s'}}>
            <div className="card-header pb-0">
              <div className="card-title">
                <h3 className="section-heading">Activity</h3>
              </div>
              <select className="sophisticated-select">
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            
            <div className="donut-layout">
              <div className="donut-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="donut-legend">
                {categoryData.map((cat, i) => (
                  <div className="legend-item hover-move-x" key={i}>
                    <div className="legend-left">
                      <span className="legend-dot" style={{backgroundColor: cat.color}}></span>
                      <span className="legend-name">{cat.name}</span>
                    </div>
                    <span className="legend-value">{categoryTotal > 0 ? Math.round((cat.value / categoryTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trends Float List */}
          <div className="card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.7s'}}>
            <div className="card-header border-none">
              <div className="card-title">
                <h3 className="section-heading">Trends</h3>
                <p className="section-sub text-fade mt-2">Monitor emerging customer patterns. Click a trend to view detailed analysis and comments.</p>
              </div>
            </div>
            <div className="floating-list">
              {trendCards.length > 0 ? trendCards.map((trend, i) => (
                <div 
                  className="float-card hover-float-card stun-item" 
                  key={trend.id} 
                  style={{animationDelay: `${i * 0.1}s`}}
                  onClick={() => onNavigateToTrend(trend.id)}
                >
                  <div className="float-card-border" style={{backgroundColor: trend.color}}></div>
                  <div className="float-card-content">
                    <h4>{trend.name}</h4>
                    <p>{trend.desc}</p>
                  </div>
                  <div className="float-card-icon">
                    <ArrowRight size={20} className="arrow-icon" />
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                  No trends detected in the current period.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* SLA Alerts Quick Access */}
        <div className="card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.8s', borderTop: '3px solid #e11d48', cursor: 'pointer'}} onClick={() => onNavigateToSLAAlerts()}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <AlertCircle size={32} style={{color: '#e11d48'}} />
              <div>
                <h3 className="section-heading" style={{marginBottom: '4px'}}>SLA Alerts</h3>
                <p className="section-sub text-fade">
                  {stats?.sla_breaches || 0} breached tickets — Monitor tickets approaching SLA deadline
                </p>
              </div>
            </div>
            <ArrowRight size={24} style={{color: '#e11d48', minWidth: '24px'}} />
          </div>
        </div>

      </div>
    </div>
  );
}
