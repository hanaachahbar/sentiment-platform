// src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { 
  TrendingUp,
  Search,
  HelpCircle,
  Bell,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
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

// --- MOCK DATA ---
const activityData = [
  { name: '01 MAY', volume: 120 }, { name: '05 MAY', volume: 210 },
  { name: '10 MAY', volume: 150 }, { name: '15 MAY', volume: 380 },
  { name: '20 MAY', volume: 220 }, { name: '25 MAY', volume: 450 },
  { name: '30 MAY', volume: 280 }
];

const categoryData = [
  { name: 'Subscription', value: 4556, color: 'var(--color-1)' }, // Blue
  { name: 'Investing', value: 3200, color: 'var(--color-2)' },   // Green
  { name: 'Groceries', value: 1500, color: 'var(--color-3)' },   // Muted Blue
  { name: 'Online Shop', value: 2800, color: 'var(--color-4)' }  // Muted Green
];

const trends = [
  { id: 1, name: 'Monthly Youth', desc: '$200 per month, unlimited', color: 'var(--color-2)' },
  { id: 2, name: 'Monthly Audit', desc: '$200 per month, unlimited 18+', color: 'var(--color-3)' },
  { id: 3, name: 'Trial', desc: '$25 one-time', color: 'var(--color-4)' },
  { id: 4, name: 'Summer Camps', desc: '$499 per year, unlimited 18+', color: 'var(--color-1)' }
];

// Sparkline Mock Data
const spark1 = [{v: 10}, {v: 25}, {v: 15}, {v: 40}, {v: 30}, {v: 50}, {v: 70}];
const spark2 = [{v: 50}, {v: 40}, {v: 45}, {v: 30}, {v: 20}, {v: 35}, {v: 15}];
const spark3 = [{v: 20}, {v: 35}, {v: 25}, {v: 40}, {v: 30}, {v: 45}, {v: 60}];
const spark4 = [{v: 60}, {v: 55}, {v: 65}, {v: 50}, {v: 45}, {v: 55}, {v: 40}];

// --- COMPONENT ---
export default function Dashboard() {
  const [activeIndex, setActiveIndex] = useState(1);

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
          outerRadius={outerRadius + 8} // Explode outward
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          filter={`url(#glow-${payload.name.replace(/\s+/g, '')})`}
        />
      </g>
    );
  };

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
        {/* KPI Cards (Sparkline Style) */}
        <div className="kpi-spark-grid mb-8">
          
          {/* Blue Variation */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.1s', borderLeft: '4px solid var(--color-1)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Productive Time <span className="text-fade">/ Day</span></span>
              <div className="kpi-spark-value">12.4 hr</div>
              <div className="kpi-spark-status" style={{color: 'var(--color-1)'}}>
                <TrendingUp size={14} /> +23% last week
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

          {/* Green Variation */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.2s', borderLeft: '4px solid var(--color-2)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Focused Time <span className="text-fade">/ Day</span></span>
              <div className="kpi-spark-value">8.5 hr</div>
              <div className="kpi-spark-status" style={{color: 'var(--color-2)'}}>
                <TrendingDown size={14} /> -18% last week
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark2}>
                  <defs>
                    <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-2)" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="var(--color-2)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="var(--color-2)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-2)" }} activeDot={false} fill="url(#grad2)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Light Blue Variation */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.3s', borderLeft: '4px solid var(--color-3)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Available Time <span className="text-fade">/ Day</span></span>
              <div className="kpi-spark-value">6.5 hr</div>
              <div className="kpi-spark-status" style={{color: 'var(--color-3)'}}>
                <TrendingUp size={14} /> +15% last week
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
          
          {/* Light Green Variation */}
          <div className="kpi-spark-card glass-panel hover-lift-shadow stun-item" style={{animationDelay: '0.4s', borderLeft: '4px solid var(--color-4)'}}>
            <div className="kpi-spark-content">
              <span className="kpi-spark-title">Lost Time <span className="text-fade">/ Day</span></span>
              <div className="kpi-spark-value">1.1 hr</div>
              <div className="kpi-spark-status" style={{color: 'var(--color-4)'}}>
                <TrendingDown size={14} /> -5% last week
              </div>
            </div>
            <div className="kpi-spark-graph">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={spark4}>
                  <defs>
                    <linearGradient id="grad4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-4)" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="var(--color-4)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="var(--color-4)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-4)" }} activeDot={false} fill="url(#grad4)" />
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
              <p className="section-sub text-fade mt-2">Volume of traffic crossing major endpoints over the last 30 days.</p>
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
                <div className="donut-center">
                  <span className="donut-label">Total</span>
                  <span className="donut-total">$4,556.00</span>
                </div>
              </div>

              <div className="donut-legend">
                {categoryData.map((cat, i) => (
                  <div className="legend-item hover-move-x" key={i}>
                    <div className="legend-left">
                      <span className="legend-dot" style={{backgroundColor: cat.color}}></span>
                      <span className="legend-name">{cat.name}</span>
                    </div>
                    <span className="legend-value">{Math.round((cat.value / 12056) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Memberships / Trends Float List */}
          <div className="card glass-panel hover-lift-shadow invisible-bg stun-item" style={{animationDelay: '0.7s'}}>
            <div className="card-header border-none">
              <div className="card-title">
                <h3 className="section-heading">Memberships</h3>
                <p className="section-sub text-fade mt-2">Generate placeholder packages. Select the active trends and tiers.</p>
              </div>
            </div>
            <div className="floating-list">
              {trends.map((trend, i) => (
                <div className="float-card hover-float-card stun-item" key={trend.id} style={{animationDelay: `${i * 0.1}s`}}>
                  <div className="float-card-border" style={{backgroundColor: trend.color}}></div>
                  <div className="float-card-content">
                    <h4>{trend.name}</h4>
                    <p>{trend.desc}</p>
                  </div>
                  <div className="float-card-icon">
                    <ArrowRight size={20} className="arrow-icon" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
