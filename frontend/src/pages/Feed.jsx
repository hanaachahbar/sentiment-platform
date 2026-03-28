import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, ExternalLink, MessageCircle, ArrowLeft, ArrowRight, ChevronDown, Calendar, X } from 'lucide-react';
import logoImg from '../assets/logo.png';

// --- MOCK DATE HELPERS ---
const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

const mockFeed = [
  {
    id: 1,
    author: "Sarah Jenkins",
    text: "Absolutely disappointed with the latest update. The export function completely broke my workflow and I've lost hours of data. Customer support has been unresponsive. Fix this immediately!",
    category: "Negative",
    isUrgent: true,
    platform: "Facebook Post",
    sla: "04:22:15",
    status: "Open",
    timestamp: hoursAgo(2)
  },
  {
    id: 2,
    author: "Marcus Chen",
    text: "Hey team, loving the interface so far! Just wondering if there's any plan to add dark mode to the mobile view? It would be a game changer for my night sessions.",
    category: "Suggestion",
    isUrgent: false,
    platform: "Facebook Comment",
    sla: "28:19:45",
    status: "Resolved",
    timestamp: daysAgo(3)
  },
  {
    id: 3,
    author: "Elena Rodriguez",
    text: "The new Sentinel analytics have literally cut my reporting time in half. The way it categorizes sentiment automatically is surprisingly accurate. Great job guys!",
    category: "Positive",
    isUrgent: false,
    platform: "Facebook Mention",
    sla: "42:55:01",
    status: "Resolved",
    timestamp: daysAgo(12)
  },
  {
    id: 4,
    author: "David Wilson",
    text: "I have been trying to cancel my subscription for three months and I am still being charged. This is unacceptable. I have sent multiple emails and no one has responded.",
    category: "Negative",
    isUrgent: true,
    platform: "Direct Message",
    sla: "-12:45:00",
    status: "Breached",
    timestamp: hoursAgo(18)
  },
  {
    id: 5,
    author: "Alex Morgan",
    text: "Does anyone know if there is a way to export the reports into PDF format directly from the dashboard, or do I need to capture it manually?",
    category: "Interrogative",
    isUrgent: false,
    platform: "Facebook Post",
    sla: "15:30:00",
    status: "Open",
    timestamp: daysAgo(5)
  },
  {
    id: 6,
    author: "Nadia Patel",
    text: "Server has been down for 20 minutes in our region. Our entire sales team is blocked. Please advise ETA.",
    category: "Negative",
    isUrgent: true,
    platform: "Twitter Mention",
    sla: "00:15:00",
    status: "Open",
    timestamp: hoursAgo(1)
  },
  {
    id: 7,
    author: "James Ford",
    text: "Just renewed my annual plan. The loyalty discount applied perfectly. Thanks for the seamless checkout process.",
    category: "Positive",
    isUrgent: false,
    platform: "Facebook Post",
    sla: "72:00:00",
    status: "Resolved",
    timestamp: daysAgo(45) // Last month
  }
];

export default function Feed() {
  const [items, setItems] = useState(mockFeed);
  
  // Filter States
  const [filterCat, setFilterCat] = useState('All');
  const [filterUrg, setFilterUrg] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Custom Dropdown Open States
  const [openDropdown, setOpenDropdown] = useState(null);
  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Time Picker States
  const [isTimeModalOpen, setTimeModalOpen] = useState(false);
  const [activeTimePreset, setActiveTimePreset] = useState('All Time');
  const [timeRange, setTimeRange] = useState({ start: null, end: null }); // JS Dates
  const [customStartStr, setCustomStartStr] = useState('');
  const [customEndStr, setCustomEndStr] = useState('');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(4);

  // Formatting helpers
  const formatDisplayTime = (isoString) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  const todayStr = now.toISOString().split('T')[0];

  // Actions
  const handleStatusChange = (id, newStatus) => {
    setItems(items.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };
  const handleCategoryChange = (id, newCat) => {
    setItems(items.map(i => i.id === id ? { ...i, category: newCat } : i));
  };

  // Time Modal Logic
  const handleApplyTimeFilter = () => {
    if (activeTimePreset === 'Custom') {
      const start = customStartStr ? new Date(customStartStr + 'T00:00:00') : null;
      const end = customEndStr ? new Date(customEndStr + 'T23:59:59') : null;
      setTimeRange({ start, end });
    } else {
      // Calculate presets
      const n = new Date();
      let start = null;
      let end = new Date(); // end is always now for past presets
      
      switch(activeTimePreset) {
        case 'Today':
          start = new Date(n.setHours(0,0,0,0));
          break;
        case 'This Week':
          start = new Date(n.setDate(n.getDate() - n.getDay()));
          break;
        case 'This Month':
          start = new Date(n.getFullYear(), n.getMonth(), 1);
          break;
        case 'Last Month':
          start = new Date(n.getFullYear(), n.getMonth() - 1, 1);
          end = new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59);
          break;
        default: // All Time
          start = null;
          end = null;
          break;
      }
      setTimeRange({ start, end });
    }
    setTimeModalOpen(false);
  };

  // Filter Computation
  const filteredItems = items.filter(item => {
    if (filterCat !== 'All' && item.category !== filterCat) return false;
    if (filterUrg === 'Urgent' && !item.isUrgent) return false;
    if (filterUrg === 'Not Urgent' && item.isUrgent) return false;
    if (filterStatus !== 'All' && item.status !== filterStatus) return false;
    
    // Time Filtering
    if (timeRange.start || timeRange.end) {
      const itemDate = new Date(item.timestamp);
      if (timeRange.start && itemDate < timeRange.start) return false;
      if (timeRange.end && itemDate > timeRange.end) return false;
    }
    
    return true;
  });

  const displayedItems = filteredItems.slice(0, visibleCount);

  const getCategoryColor = (cat) => {
    switch(cat) {
      case 'Positive': return 'var(--brand-green)';
      case 'Negative': return 'var(--brand-blue-muted)'; 
      case 'Suggestion': return 'var(--brand-blue)';
      case 'Off-Topic': return 'var(--text-secondary)';
      case 'Interrogative': return 'var(--brand-green-muted)';
      default: return 'var(--text-secondary)';
    }
  };

  // Auto-close modal on escape
  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === 'Escape') {
        setTimeModalOpen(false);
        setOpenDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="dashboard-wrapper" onClick={() => { if(openDropdown) setOpenDropdown(null) }}>

      <div className="dashboard-container fade-in-up" style={{animationDelay: '0.1s'}}>
        
        {/* Title Area with Logo */}
        <div className="feed-header mb-8 stun-item">
          <div className="feed-header-content">
            <img src={logoImg} alt="Sentinel Logo" className="feed-logo" />
            <div className="feed-title-section">
              <h1 className="feed-title text-primary" style={{fontSize: '36px'}}>Interactive Feed</h1>
              <p className="section-sub text-fade mt-2" style={{fontSize: '18px'}}>Real-time sentiment processing and response orchestration for multi-channel feedback.</p>
            </div>
          </div>
        </div>

        {/* Filter Bar - Dropdown Lists */}
        <div className="feed-filters glass-panel-filter stun-item" style={{animationDelay: '0.2s'}}>
          
          <div className="filter-group">
            <span className="filter-label text-fade" style={{fontSize: '14px'}}>Filters:</span>
            
            {/* Category Dropdown */}
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className={`dropdown-trigger ${openDropdown === 'cat' ? 'active' : ''}`} onClick={() => toggleDropdown('cat')}>
                {filterCat === 'All' ? 'All Categories' : filterCat} <ChevronDown size={16} className="ml-1"/>
              </button>
              {openDropdown === 'cat' && (
                <div className="dropdown-menu-list stun-item">
                  {['All', 'Positive', 'Negative', 'Suggestion', 'Interrogative', 'Off-Topic'].map(c => (
                    <button key={c} className={`menu-item ${filterCat === c ? 'active' : ''}`} onClick={() => { setFilterCat(c); setOpenDropdown(null); }}>
                      {c === 'All' ? 'All Categories' : c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Urgency Dropdown */}
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className={`dropdown-trigger ${openDropdown === 'urg' ? 'active' : ''}`} onClick={() => toggleDropdown('urg')}>
                {filterUrg === 'All' ? 'Urgency: All' : filterUrg} <ChevronDown size={16} className="ml-1"/>
              </button>
              {openDropdown === 'urg' && (
                <div className="dropdown-menu-list stun-item">
                  {['All', 'Urgent', 'Not Urgent'].map(u => (
                    <button key={u} className={`menu-item ${filterUrg === u ? 'active' : ''}`} onClick={() => { setFilterUrg(u); setOpenDropdown(null); }}>
                      {u === 'All' ? 'All Urgency' : u}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className={`dropdown-trigger ${openDropdown === 'stat' ? 'active' : ''}`} onClick={() => toggleDropdown('stat')}>
                {filterStatus === 'All' ? 'Status: All' : filterStatus} <ChevronDown size={16} className="ml-1"/>
              </button>
              {openDropdown === 'stat' && (
                <div className="dropdown-menu-list stun-item">
                  {['All', 'Open', 'Resolved', 'Breached'].map(s => (
                    <button key={s} className={`menu-item ${filterStatus === s ? 'active' : ''}`} onClick={() => { setFilterStatus(s); setOpenDropdown(null); }}>
                      {s === 'All' ? 'All Statuses' : s}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="filter-group ml-auto">
             <button className="massive-time-btn hover-lift-shadow pulse-animation" onClick={() => setTimeModalOpen(true)}>
               <Calendar size={18} className="mr-2" style={{marginRight: '8px'}}/> {activeTimePreset === 'Custom' ? 'Custom Range' : activeTimePreset}
             </button>
          </div>
        </div>

        {/* Feed List */}
        <div className="feed-list mt-8">
          {displayedItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`card glass-panel hover-lift-shadow stun-item  ${item.isUrgent ? 'urgent-layer' : ''}`}
              style={{
                animationDelay: `${0.1 + ((index % 4) * 0.1)}s`, 
                borderLeft: `6px solid ${getCategoryColor(item.category)}`
              }}
            >
              <div className="feed-card-header">
                <div className="feed-user-info">
                  <span className="feed-author">{item.author}</span>
                  <span className="feed-platform text-fade"><MessageCircle size={14} style={{marginRight: '6px'}}/> {item.platform} • {formatDisplayTime(item.timestamp)}</span>
                </div>
                
                <div className="feed-badges">
                  {item.isUrgent && (
                    <span className="badge-urgent"><AlertCircle size={16}/> HIGH URGENCY</span>
                  )}
                  <span className="badge-sla text-fade">
                    <Clock size={16}/> SLA: <span style={{color: item.status === 'Breached' ? '#e11d48' : 'inherit', marginLeft: '6px'}}>{item.sla}</span>
                  </span>
                </div>
              </div>

              <div className="feed-body">
                <p className="feed-text">{item.text}</p>
              </div>

              <div className="feed-footer">
                <div className="feed-control">
                  <span className="control-label text-fade">CATEGORY:</span>
                  <select 
                    className="micro-select larger-font"
                    value={item.category}
                    onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                  >
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Suggestion">Suggestion</option>
                    <option value="Interrogative">Interrogative</option>
                    <option value="Off-Topic">Off-Topic</option>
                  </select>
                </div>

                <div className="feed-control">
                  <span className="control-label text-fade">STATUS:</span>
                  <div className="status-pill-group">
                    <button 
                      className={`status-pill larger-font ${item.status === 'Open' ? 'active-open' : ''}`}
                      onClick={() => handleStatusChange(item.id, 'Open')}
                    >Open</button>
                    <button 
                      className={`status-pill larger-font ${item.status === 'Resolved' ? 'active-resolved' : ''}`}
                      onClick={() => handleStatusChange(item.id, 'Resolved')}
                    >Resolved</button>
                    <button 
                      className={`status-pill larger-font ${item.status === 'Breached' ? 'active-breached' : ''}`}
                      onClick={() => handleStatusChange(item.id, 'Breached')}
                    >Breached</button>
                  </div>
                </div>

                <a href="#reply" className="facebook-reply-btn btn-inline slide-in-btn ml-auto">
                  <ExternalLink size={18} className="mr-2" style={{marginRight: '8px'}} />
                  Reply on Facebook
                </a>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="empty-state text-fade mt-8 stun-item" style={{textAlign: 'center', padding: '60px', fontSize: '20px'}}>
              No feedback items match your filters for the selected time range.
            </div>
          )}
        </div>

        {/* Pagination & Load More */}
        {filteredItems.length > visibleCount && (
          <div className="pagination-wrapper mt-8 stun-item" style={{animationDelay: '0.2s'}}>
            <div className="pagination-controls glass-panel">
              <button className="page-btn page-arrow"><ArrowLeft size={18} /></button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <span className="page-dots text-fade">...</span>
              <button className="page-btn page-arrow"><ArrowRight size={18} /></button>
            </div>
            
            <button 
              className="load-more-full-btn hover-lift-shadow font-lg"
              onClick={() => setVisibleCount(prev => prev + 4)}
            >
              Show More Comments
            </button>
          </div>
        )}

      </div>

      {/* --- MASSIVE FULL SCREEN TIME MODAL --- */}
      {isTimeModalOpen && (
        <div className="fullscreen-overlay stun-item">
          <div className="time-modal-container glass-panel fade-in-up">
            
            <div className="time-modal-header">
              <h2 className="text-primary" style={{fontSize: '32px', display: 'flex', alignItems: 'center'}}><Calendar size={32} style={{marginRight: '12px', color: 'var(--brand-blue)'}}/> Select Time Range</h2>
              <button className="modal-close-btn hover-lift" onClick={() => setTimeModalOpen(false)}><X size={32} /></button>
            </div>

            <div className="time-modal-body">
              {/* Left Form: Fast Presets */}
              <div className="time-preset-column">
                <h3 className="section-sub text-fade mb-4" style={{textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700'}}>Fast Filters</h3>
                <div className="preset-grid">
                  {['All Time', 'Today', 'This Week', 'This Month', 'Last Month'].map(preset => (
                    <button 
                      key={preset}
                      className={`massive-preset-btn ${activeTimePreset === preset ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTimePreset(preset);
                        setCustomStartStr('');
                        setCustomEndStr('');
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                  <button 
                    className={`massive-preset-btn ${activeTimePreset === 'Custom' ? 'active' : ''}`}
                    onClick={() => setActiveTimePreset('Custom')}
                  >
                    Custom Dates...
                  </button>
                </div>
              </div>

              {/* Right Form: Custom Selectors */}
              <div className="time-custom-column">
                <h3 className="section-sub text-fade mb-4" style={{textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700'}}>Manual Constraint</h3>
                
                <div className={`custom-boxes ${activeTimePreset !== 'Custom' ? 'disabled-area' : ''}`}>
                  <div className="date-input-group">
                    <label>Start Date</label>
                    <input 
                      type="date" 
                      className="massive-date-input" 
                      max={todayStr}
                      value={customStartStr}
                      onChange={(e) => { setActiveTimePreset('Custom'); setCustomStartStr(e.target.value); }}
                    />
                  </div>
                  <div className="date-input-group" style={{marginTop: '24px'}}>
                    <label>End Date (Max Today)</label>
                    <input 
                      type="date" 
                      className="massive-date-input" 
                      max={todayStr}
                      value={customEndStr}
                      onChange={(e) => { setActiveTimePreset('Custom'); setCustomEndStr(e.target.value); }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="time-modal-footer">
              <button className="massive-apply-btn hover-lift-shadow" onClick={handleApplyTimeFilter}>
                Apply Filter & Return
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
