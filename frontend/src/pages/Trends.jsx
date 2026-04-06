import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  X,
  AlertCircle,
  Clock,
  ChevronRight,
  Loader,
  Minus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import logoImg from '../assets/logo.png';
import { fetchTrends } from '../api';

const TREND_COLORS = ['#3b82f6', '#0f5132', '#10b981', '#64748b', '#e11d48', '#eab308', '#8b5cf6', '#ec4899'];

export default function Trends({ initialTrendId, onClearInitialTrend }) {
  const [modalTrend, setModalTrend] = useState(null);
  const [trendCards, setTrendCards] = useState([]);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch trends from backend
  useEffect(() => {
    async function loadTrends() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTrends();
        const cards = (data.trends || []).map((t, i) => ({
          id: t.topic || `trend-${i}`,
          title: t.topic || 'Unknown Topic',
          mentions: t.count || 0,
          change: t.change || '0 vs previous period',
          direction: t.direction || 'stable',
          type: t.direction === 'up' ? 'critical' : t.direction === 'down' ? 'declining' : 'stable',
          color: TREND_COLORS[i % TREND_COLORS.length],
          progress: Math.min(100, (t.count || 0) * 2), // Rough progress bar
          comments: (t.tickets || []).map(ticket => ({
            id: ticket.id,
            author: ticket.author || 'Unknown',
            text: ticket.text || '',
            platform: 'Facebook Post',
            timestamp: 'Recent',
            source_link: ticket.source_link || '',
          })),
        }));
        setTrendCards(cards);
        setPeriodInfo({
          current: data.current_period,
          previous: data.previous_period,
        });
      } catch (err) {
        console.error('Trends load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, []);

  // Handle cross-page navigation from Dashboard
  useEffect(() => {
    if (initialTrendId && trendCards.length > 0) {
      const trend = trendCards.find(t => t.id === initialTrendId);
      if (trend) {
        setModalTrend(trend);
        onClearInitialTrend();
      }
    }
  }, [initialTrendId, onClearInitialTrend, trendCards]);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModalTrend(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Build chart data from top trends (simulate daily distribution)
  const trendChartData = (() => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return days.map((name, i) => {
      const point = { name };
      trendCards.slice(0, 4).forEach((trend, j) => {
        // Distribute mentions across days with some variation
        const base = Math.max(1, Math.floor(trend.mentions / 7));
        const variation = Math.floor(Math.random() * base * 0.6);
        point[`topic_${j}`] = base + (i % 2 === 0 ? variation : -Math.floor(variation / 2));
      });
      return point;
    });
  })();

  // Delta display helper
  const getDeltaDisplay = (change) => {
    if (!change) return { text: 'stable', cls: 'neutral' };
    if (change.startsWith('+')) return { text: change.split(' ')[0], cls: 'pos' };
    if (change.startsWith('-')) return { text: change.split(' ')[0], cls: 'neg' };
    return { text: 'stable', cls: 'neutral' };
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <Loader size={48} style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading trend data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#e11d48' }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Failed to load trends</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container fade-in-up">

        {/* Header */}
        <div className="feed-header mb-8 stun-item">
          <div className="feed-header-content">
            <img src={logoImg} alt="Sentiment Platform Logo" className="feed-logo" />
            <div className="feed-title-section">
              <h1 className="feed-title text-primary" style={{ fontSize: '36px' }}>Trend Analysis</h1>
              <p className="section-sub text-fade mt-2" style={{ fontSize: '18px' }}>
                Surface emerging customer patterns and intelligence across all channels.
                {periodInfo && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
                    Analyzing {new Date(periodInfo.current?.from).toLocaleDateString()} — {new Date(periodInfo.current?.to).toLocaleDateString()} vs previous period
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="card glass-panel mb-8 stun-item" style={{ animationDelay: '0.1s' }}>
          <div className="card-header border-none pb-0">
            <div className="card-title">
              <h3 className="section-heading">Trend Volume over Time</h3>
              <p className="section-sub text-fade mt-1">Granular signal tracking across top trending topics.</p>
            </div>
            <div className="card-action">
              <div className="legend-pills">
                {trendCards.slice(0, 4).map((t, i) => (
                  <span key={t.id} className="legend-pill">
                    <i style={{ backgroundColor: t.color }}></i> {t.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-container" style={{ height: '320px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData}>
                <defs>
                  {trendCards.slice(0, 4).map((t, i) => (
                    <linearGradient key={`grad-${i}`} id={`colorTrend${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={t.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={t.color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(15, 28, 46, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                {trendCards.slice(0, 4).map((t, i) => (
                  <Area
                    key={t.id}
                    type="monotone"
                    dataKey={`topic_${i}`}
                    name={t.title}
                    stroke={t.color}
                    strokeWidth={i < 2 ? 3 : 2}
                    strokeDasharray={i >= 2 ? '5 5' : undefined}
                    fillOpacity={i < 2 ? 1 : 0}
                    fill={i < 2 ? `url(#colorTrend${i})` : 'none'}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trends Grid — 4 columns, each with 2 preview comments */}
        <div className="trends-4col-grid">
          {trendCards.length > 0 ? trendCards.map((trend, index) => {
            const delta = getDeltaDisplay(trend.change);
            return (
              <div
                key={trend.id}
                className="trend-card-full glass-panel stun-item"
                style={{
                  animationDelay: `${0.2 + index * 0.08}s`,
                  borderTop: `4px solid ${trend.color}`,
                  '--trend-color': trend.color,
                }}
              >
                {/* Title + Stats */}
                <div className="tcf-stats">
                  <h3 className="tcf-title">{trend.title}</h3>
                  <div className="tcf-numbers">
                    <span className="tcf-count" style={{ color: trend.color }}>{trend.mentions}</span>
                    <span className="tcf-unit">mentions</span>
                    <span className={`tcf-delta ${delta.cls}`}>
                      {trend.direction === 'up' && <TrendingUp size={12} style={{ marginRight: '4px' }} />}
                      {trend.direction === 'down' && <TrendingDown size={12} style={{ marginRight: '4px' }} />}
                      {trend.direction === 'stable' && <Minus size={12} style={{ marginRight: '4px' }} />}
                      {delta.text}
                    </span>
                  </div>
                  <div className="tcf-progress-track">
                    <div className="tcf-progress-fill" style={{ width: `${trend.progress}%`, background: trend.color }}></div>
                  </div>
                </div>

                {/* 2 Preview Comments */}
                <div className="tcf-comments-preview">
                  {trend.comments.slice(0, 2).map((c, ci) => (
                    <div key={c.id} className="tcf-comment-item" style={{ animationDelay: `${0.05 * ci}s` }}>
                      <div className="tcf-comment-top">
                        <span className="tcf-comment-author">{c.author}</span>
                        <span className="tcf-comment-time">{c.timestamp}</span>
                      </div>
                      <p className="tcf-comment-text">"{c.text}"</p>
                      {c.fb_link && (
                        <a href={c.fb_link} target="_blank" rel="noreferrer" className="tcf-reply-link">
                          <ExternalLink size={12} /> Reply on Facebook
                        </a>
                      )}
                    </div>
                  ))}

                  {trend.comments.length === 0 && (
                    <div className="tcf-empty">No signals yet for this trend.</div>
                  )}
                </div>

                {/* Show More Button */}
                <button
                  className="tcf-show-more-btn"
                  style={{ '--trend-color': trend.color, borderColor: `${trend.color}50`, color: trend.color }}
                  onClick={() => setModalTrend(trend)}
                >
                  <ChevronRight size={16} style={{ marginRight: '6px' }} />
                  Show More · {trend.comments.length} signal{trend.comments.length !== 1 ? 's' : ''}
                </button>
              </div>
            );
          }) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '20px' }}>
              No trends detected in the current analysis period.
            </div>
          )}
        </div>

      </div>

      {/* --- FULL SIGNALS MODAL --- */}
      {modalTrend && (
        <div className="fullscreen-overlay stun-item" onClick={() => setModalTrend(null)}>
          <div
            className="time-modal-container glass-panel fade-in-up"
            style={{ maxWidth: '900px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="time-modal-header" style={{ borderBottom: `2px solid ${modalTrend.color}40` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', color: modalTrend.color, textTransform: 'uppercase' }}>
                  {modalTrend.type}
                </span>
                <h2 className="text-primary" style={{ fontSize: '28px' }}>
                  {modalTrend.title} — Comments
                </h2>
                <p className="text-fade" style={{ fontSize: '16px' }}>
                  {modalTrend.comments.length} customer signal{modalTrend.comments.length !== 1 ? 's' : ''} · {modalTrend.mentions} total mentions
                </p>
              </div>
              <button className="modal-close-btn hover-lift" onClick={() => setModalTrend(null)}>
                <X size={28} />
              </button>
            </div>

            {/* Modal Body — signals list */}
            <div style={{ overflowY: 'auto', maxHeight: '65vh', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {modalTrend.comments.map((c, idx) => (
                <div
                  key={c.id}
                  className="signal-item stun-item"
                  style={{ animationDelay: `${idx * 0.06}s`, borderLeft: `4px solid ${modalTrend.color}` }}
                >
                  <div className="signal-meta">
                    <span className="signal-author" style={{ fontSize: '18px' }}>{c.author}</span>
                    <span className="signal-time">{c.timestamp}</span>
                  </div>
                  <p className="signal-text-large" style={{ fontSize: '20px', margin: '14px 0 18px' }}>{c.text}</p>
                  <div className="signal-actions">
                    <span className="text-fade" style={{ fontSize: '14px' }}>{c.platform}</span>
                    {c.source_link && (
                      <a href={c.source_link} target="_blank" rel="noreferrer" className="facebook-reply-btn btn-inline">
                        <ExternalLink size={14} style={{ marginRight: '6px' }} />
                        Reply on Facebook
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {modalTrend.comments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '20px' }}>
                  No signals recorded for this trend yet.
                </div>
              )}
            </div>

            <div className="time-modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Showing all {modalTrend.comments.length} signal{modalTrend.comments.length !== 1 ? 's' : ''} for "{modalTrend.title}"</span>
              <button className="massive-apply-btn hover-lift-shadow" onClick={() => setModalTrend(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* 4-column trend grid */
        .trends-4col-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }

        /* Full Trend Card */
        .trend-card-full {
          display: flex;
          flex-direction: column;
          padding: 24px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
        }
        .trend-card-full:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px -8px var(--trend-color, rgba(0,0,0,0.4));
        }

        .tcf-stats {
          margin-bottom: 20px;
        }
        .tcf-title {
          font-size: 22px;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
          line-height: 1.3;
        }
        .tcf-numbers {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 12px;
        }
        .tcf-count {
          font-size: 42px;
          font-weight: 800;
          line-height: 1;
        }
        .tcf-unit {
          font-size: 16px;
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }
        .tcf-delta {
          font-size: 15px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 99px;
          display: inline-flex;
          align-items: center;
        }
        .tcf-delta.pos  { color: #10b981; background: rgba(16,185,129,0.12); }
        .tcf-delta.neg  { color: #e11d48; background: rgba(225,29,72,0.12); }
        .tcf-delta.neutral { color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.08); }

        .tcf-progress-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .tcf-progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 1.2s ease;
        }

        /* Comment Previews */
        .tcf-comments-preview {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          margin-top: 4px;
        }
        .tcf-comment-item {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 14px;
          transition: background 0.2s;
        }
        .tcf-comment-item:hover {
          background: rgba(255,255,255,0.08);
        }
        .tcf-comment-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .tcf-comment-author {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }
        .tcf-comment-time {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
        }
        .tcf-comment-text {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255,255,255,0.85);
          margin-bottom: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .tcf-reply-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          font-weight: 600;
          color: var(--brand-blue);
          text-decoration: none;
          transition: color 0.2s;
        }
        .tcf-reply-link:hover { color: #93c5fd; }
        .tcf-empty {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          padding: 20px;
        }

        /* Show More Button */
        .tcf-show-more-btn {
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .tcf-show-more-btn:hover {
          background: var(--trend-color, rgba(255,255,255,0.05));
          color: white !important;
          border-color: var(--trend-color, rgba(255,255,255,0.3)) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }

        /* Shared signal item used in modal */
        .signal-item {
          padding: 20px 24px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }
        .signal-item:hover {
          background: rgba(255, 255, 255, 0.07);
        }
        .signal-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .signal-author { font-weight: 700; color: white; }
        .signal-time   { color: rgba(255,255,255,0.35); font-size: 13px; }
        .signal-text-large {
          line-height: 1.6;
          color: rgba(255,255,255,0.9);
          font-weight: 500;
        }
        .signal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Legend pills (chart) */
        .legend-pills { display: flex; gap: 16px; flex-wrap: wrap; }
        .legend-pill { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); }
        .legend-pill i { width: 8px; height: 8px; border-radius: 50%; }

        .mb-8 { margin-bottom: 32px; }

        @media (max-width: 1400px) {
          .trends-4col-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .trends-4col-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
