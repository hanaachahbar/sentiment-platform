// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Search,
  HelpCircle,
  Bell,
  ArrowRight,
  TrendingDown,
  AlertCircle,
  Loader,
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
} from 'recharts';
import { fetchStats, fetchTrends } from '../api';

const CATEGORY_COLORS = [
  'var(--color-1)',
  'var(--color-2)',
  'var(--color-3)',
  'var(--color-5)',
  'var(--color-4)',
  '#e11d48',
  '#eab308',
  '#8b5cf6',
];

const TREND_COLORS = ['#3b82f6', '#0f5132', '#10b981', '#64748b', '#e11d48', '#eab308'];

function withCategoryColors(categories) {
  return categories.map((entry, index) => ({
    ...entry,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
}

function buildTrendCards(trends) {
  return trends.slice(0, 4).map((trend, index) => ({
    id: trend.topic_id ?? `trend-${index}`,
    name: trend.topic || 'Unknown Topic',
    desc: `${trend.count} mentions · ${trend.change}`,
    color: TREND_COLORS[index % TREND_COLORS.length],
  }));
}

export default function Dashboard({ onNavigateToTrend = () => {}, onNavigateToSLAAlerts = () => {} }) {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [statsData, trendsData] = await Promise.all([
          fetchStats(),
          fetchTrends(),
        ]);

        if (cancelled) return;

        setStats(statsData);
        setTrends(trendsData.trends || []);
      } catch (err) {
        if (cancelled) return;
        console.error('Dashboard load error:', err);
        setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardSeries = useMemo(
    () => stats?.dashboard?.daily_activity ?? [],
    [stats],
  );
  const categoryData = useMemo(
    () => withCategoryColors(stats?.dashboard?.category_breakdown ?? []),
    [stats],
  );
  const categoryTotal = useMemo(
    () => categoryData.reduce((sum, category) => sum + category.value, 0),
    [categoryData],
  );
  const spark1 = useMemo(() => dashboardSeries.map((day) => ({ v: day.volume })), [dashboardSeries]);
  const spark2 = useMemo(() => dashboardSeries.map((day) => ({ v: day.open })), [dashboardSeries]);
  const spark3 = useMemo(() => dashboardSeries.map((day) => ({ v: day.resolved })), [dashboardSeries]);
  const spark4 = useMemo(() => dashboardSeries.map((day) => ({ v: day.breached })), [dashboardSeries]);
  const activityData = useMemo(
    () => dashboardSeries.map((day) => ({ name: day.name, volume: day.volume })),
    [dashboardSeries],
  );
  const trendCards = useMemo(() => buildTrendCards(trends), [trends]);

  const totalTickets = stats?.total_tickets ?? 0;
  const openTickets = stats?.open_tickets ?? 0;
  const breachedTickets = stats?.breached_tickets ?? 0;
  const resolvedTickets = stats?.resolved_tickets ?? 0;
  const avgResponseHours = stats?.avg_response_hours;
  const slaBreachRate = totalTickets > 0
    ? ((breachedTickets / totalTickets) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <Loader size={48} style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
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
          <button type="button" className="icon-btn hover-glow text-primary">
            <Bell size={20} />
            <span className="notification-dot"></span>
          </button>
          <button type="button" className="icon-btn hover-glow text-primary">
            <HelpCircle size={20} />
          </button>
          <img src="https://i.pravatar.cc/150?img=47" alt="Profile" className="profile-avatar border-glow" />
        </div>
      </header>

      <div className="dashboard-container fade-in-up">
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

        <div className="kpi-spark-grid mb-8">
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{ animationDelay: '0.1s', borderLeft: '4px solid var(--color-1)' }}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Total Mentions <span className="text-fade">/ Today</span></span>
              <div className="kpi-spark-value">{stats?.total_posts_today?.toLocaleString() || '0'}</div>
              <div className="kpi-spark-status" style={{ color: 'var(--color-1)' }}>
                <TrendingUp size={14} /> {totalTickets.toLocaleString()} total
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark1}>
                  <Line type="monotone" dataKey="v" stroke="var(--color-1)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="kpi-spark-card glass-panel stun-item" style={{ animationDelay: '0.2s', borderLeft: '4px solid #e11d48' }}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Open Tickets <span className="text-fade">/ Unresolved</span></span>
              <div className="kpi-spark-value" style={{ color: '#e11d48' }}>{openTickets}</div>
              <div className="kpi-spark-status" style={{ color: '#e11d48' }}>
                <TrendingUp size={14} /> {breachedTickets} breached
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark2}>
                  <Line type="monotone" dataKey="v" stroke="#e11d48" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{ animationDelay: '0.3s', borderLeft: '4px solid var(--color-3)' }}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Avg. Response <span className="text-fade">/ Time</span></span>
              <div className="kpi-spark-value">{avgResponseHours === null || avgResponseHours === undefined ? '—' : `${avgResponseHours.toFixed(1)} hr`}</div>
              <div className="kpi-spark-status" style={{ color: 'var(--brand-green)' }}>
                <TrendingDown size={14} /> across {resolvedTickets} resolved
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark3}>
                  <Line type="monotone" dataKey="v" stroke="var(--color-3)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{ animationDelay: '0.4s', borderLeft: '4px solid #eab308' }}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">SLA Breach Rate <span className="text-fade">/ 48h</span></span>
              <div className="kpi-spark-value" style={{ color: '#eab308' }}>{slaBreachRate}%</div>
              <div className="kpi-spark-status" style={{ color: '#e11d48' }}>
                <AlertCircle size={14} /> {breachedTickets} breaches total
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark4}>
                  <Line type="monotone" dataKey="v" stroke="#eab308" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card glass-panel hover-shadow mb-8 stun-item" style={{ animationDelay: '0.5s' }}>
          <div className="card-header pb-0">
            <div className="card-title">
              <h3 className="section-heading">Daily Activity Flow</h3>
              <p className="section-sub text-fade mt-2">Volume of ticket activity grouped by day.</p>
            </div>
            <div className="card-action">
              <span className="volume-indicator pulse-animation" style={{ backgroundColor: 'var(--color-2)' }}></span> LIVE
            </div>
          </div>
          <div className="chart-container" style={{ height: '240px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <filter id="shadowMain" height="200%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="var(--color-1)" floodOpacity="0.4" />
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
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  filter="url(#shadowMain)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="charts-grid-alt mb-8">
          <div className="card glass-panel hover-lift-shadow stun-item" style={{ animationDelay: '0.6s' }}>
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
                      isAnimationActive={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="donut-legend">
                {categoryData.map((cat, index) => (
                  <div className="legend-item hover-move-x" key={index}>
                    <div className="legend-left">
                      <span className="legend-dot" style={{ backgroundColor: cat.color }}></span>
                      <span className="legend-name">{cat.name}</span>
                    </div>
                    <span className="legend-value">{categoryTotal > 0 ? Math.round((cat.value / categoryTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card glass-panel hover-lift-shadow stun-item" style={{ animationDelay: '0.7s' }}>
            <div className="card-header border-none">
              <div className="card-title">
                <h3 className="section-heading">Trends</h3>
                <p className="section-sub text-fade mt-2">Monitor emerging customer patterns. Click a trend to view detailed analysis and comments.</p>
              </div>
            </div>
            <div className="floating-list">
              {trendCards.length > 0 ? trendCards.map((trend, index) => (
                <div
                  className="float-card hover-float-card stun-item"
                  key={trend.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => onNavigateToTrend(trend.id)}
                >
                  <div className="float-card-border" style={{ backgroundColor: trend.color }}></div>
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

        <div
          className="card glass-panel hover-lift-shadow stun-item"
          style={{ animationDelay: '0.8s', borderTop: '3px solid #e11d48', cursor: 'pointer' }}
          onClick={() => onNavigateToSLAAlerts()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={32} style={{ color: '#e11d48' }} />
              <div>
                <h3 className="section-heading" style={{ marginBottom: '4px' }}>SLA Alerts</h3>
                <p className="section-sub text-fade">
                  {breachedTickets} breached tickets - Monitor tickets approaching SLA deadline
                </p>
              </div>
            </div>
            <ArrowRight size={24} style={{ color: '#e11d48', minWidth: '24px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}