import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, ExternalLink, MessageCircle, ArrowLeft, ArrowRight, ChevronDown, Calendar, X, Download, FileText, Loader } from 'lucide-react';

// Inline brand icons (not in this lucide-react version)
const FbIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877f2" style={{ flexShrink: 0 }}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
const IgIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#c13584" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="#c13584" stroke="none" />
  </svg>
);
import logoImg from '../assets/logo.png';
import { fetchPosts, updateCategory, resolveTicket, exportTickets } from '../api';

// SLA formatting helper: compute remaining time from sla_deadline
function formatSLA(slaDeadline, status) {
  if (!slaDeadline) return '—';

  if ((status || '').toLowerCase() === 'resolved') {
    return 'Resolved';
  }

  const now = new Date();
  const deadline = new Date(slaDeadline);

  if (Number.isNaN(deadline.getTime())) {
    return '—';
  }

  const diffMs = deadline - now;
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  if (diffMs < 0) {
    return `Breached by ${days}d ${hours}h ${minutes}m`;
  }

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m left`;
  }

  return `${hours}h ${minutes}m ${seconds}s left`;
}

// Capitalize first letter helper
function _capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function _normalizeCategoryValue(value) {
  return (value || '').toString().trim();
}

function _getEffectiveCategory(item) {
  const primary = _normalizeCategoryValue(item?.category);
  if (primary) return primary;

  const manual = _normalizeCategoryValue(item?.category_manual);
  return manual;
}

function _getFacebookReplyLink(item) {
  const sourceLink = (item?.source_link || '').toString().trim();
  if (sourceLink) return sourceLink;

  const searchText = [item?.text, item?.author]
    .filter(Boolean)
    .map((value) => value.toString().trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!searchText) {
    return 'https://www.facebook.com/';
  }

  return `https://www.facebook.com/search/posts/?q=${encodeURIComponent(searchText)}`;
}

export default function Feed() {
  const PAGE_SIZE = 4;

  // API data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [filterCat, setFilterCat] = useState('All');
  const [filterUrg, setFilterUrg] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');
  
  // Custom Dropdown Open States
  const [openDropdown, setOpenDropdown] = useState(null);
  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Time Picker States
  const [isTimeModalOpen, setTimeModalOpen] = useState(false);
  const [activeTimePreset, setActiveTimePreset] = useState('All Time');
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const [customStartStr, setCustomStartStr] = useState('');
  const [customEndStr, setCustomEndStr] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageJumpValue, setPageJumpValue] = useState('1');

  // Export Modal State
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportColumns, setExportColumns] = useState({
    customerName: true,
    dateTime: true,
    commentText: true,
    isUrgent: false,
    category: true,
    status: true,
    slaValue: true,
    platform: true,
  });
  const toggleExportColumn = (key) => setExportColumns(prev => ({ ...prev, [key]: !prev[key] }));

  // Available categories (dynamically populated from data)
  const [availableCategories, setAvailableCategories] = useState(['All']);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Load posts from backend
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build filter params for backend
      const params = {};
      if (filterPlatform !== 'All') params.platform = filterPlatform.toLowerCase();
      if (filterCat !== 'All') params.category = filterCat.toLowerCase();
      if (filterStatus !== 'All') params.status = filterStatus.toLowerCase();
      if (filterUrg === 'Urgent') params.is_urgent = true;
      if (filterUrg === 'Not Urgent') params.is_urgent = false;
      if (timeRange.start) params.from_date = timeRange.start.toISOString();
      if (timeRange.end) params.to_date = timeRange.end.toISOString();

      const data = await fetchPosts(params);
      const tickets = data.tickets || [];
      setItems(tickets);

      const categoryMap = new Map();
      tickets.forEach((item) => {
        const category = _getEffectiveCategory(item);
        if (!category) return;

        const key = category.toLowerCase();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, category);
        }
      });

      const dynamicCategories = Array.from(categoryMap.values()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      setAvailableCategories(['All', ...dynamicCategories]);
    } catch (err) {
      console.error('Feed load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterUrg, filterPlatform, filterCat, timeRange.start, timeRange.end]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const hasCurrentCategory = availableCategories.some(
      (category) => category.toLowerCase() === filterCat.toLowerCase()
    );

    if (filterCat !== 'All' && !hasCurrentCategory) {
      setFilterCat('All');
    }
  }, [availableCategories, filterCat]);

  // Formatting helpers
  const formatDisplayTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  // Actions — call backend then refresh
  const handleStatusChange = async (id, newStatus) => {
    try {
      if (newStatus === 'Resolved' || newStatus === 'resolved') {
        await resolveTicket(id);
      }
      // Optimistically update local state
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus.toLowerCase() } : i));
    } catch (err) {
      console.error('Status change error:', err);
      // Refresh to get real state
      loadPosts();
    }
  };

  const handleCategoryChange = async (id, newCat) => {
    try {
      await updateCategory(id, newCat);
      // Optimistically update local state
      setItems(prev => prev.map(i => i.id === id ? { ...i, category: newCat, category_manual: newCat, manually_corrected: true } : i));
    } catch (err) {
      console.error('Category change error:', err);
      loadPosts();
    }
  };

  // Time Modal Logic
  const handleApplyTimeFilter = () => {
    if (activeTimePreset === 'Custom') {
      const start = customStartStr ? new Date(customStartStr + 'T00:00:00') : null;
      const end = customEndStr ? new Date(customEndStr + 'T23:59:59') : null;
      setTimeRange({ start, end });
    } else {
      const n = new Date();
      let start = null;
      let end = new Date();
      
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
    const itemCategory = _getEffectiveCategory(item);
    if (
      filterCat !== 'All' &&
      itemCategory.toLowerCase() !== filterCat.toLowerCase()
    ) {
      return false;
    }

    // Platform filter
    if (filterPlatform !== 'All') {
      const itemPlatform = (item.platform || '').toLowerCase();
      if (!itemPlatform.includes(filterPlatform.toLowerCase())) return false;
    }
    
    // Time Filtering (client-side on created_at)
    if (timeRange.start || timeRange.end) {
      const itemDate = new Date(item.created_at);
      if (timeRange.start && itemDate < timeRange.start) return false;
      if (timeRange.end && itemDate > timeRange.end) return false;
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const displayedItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE);

  const handlePageJump = () => {
    const parsedPage = Number(pageJumpValue);
    if (!Number.isFinite(parsedPage)) return;

    const nextPage = Math.max(1, Math.min(totalPages, Math.trunc(parsedPage)));
    setCurrentPage(nextPage);
    setPageJumpValue(String(nextPage));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCat, filterUrg, filterStatus, filterPlatform, timeRange.start, timeRange.end]);

  useEffect(() => {
    setPageJumpValue(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getCategoryColor = (cat) => {
    if (!cat) return 'var(--text-secondary)';
    const lower = cat.toLowerCase();
    switch(lower) {
      case 'compliment':
      case 'positive': return 'var(--brand-green)';
      case 'complaint':
      case 'negative': return 'var(--brand-blue-muted)'; 
      case 'suggestion': return 'var(--brand-blue)';
      case 'out_of_topic':
      case 'off-topic': return 'var(--text-secondary)';
      case 'inquiry':
      case 'interrogative': return 'var(--brand-green-muted)';
      case 'escalation': return '#e11d48';
      case 'neutral': return '#64748b';
      default: return 'var(--text-secondary)';
    }
  };

  // Auto-close modals on escape
  useEffect(() => {
    const handleKeyDown = (e) => { 
      if (e.key === 'Escape') {
        setTimeModalOpen(false);
        setOpenDropdown(null);
        setExportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Export logic — call backend API
  const handleExportNow = async () => {
    try {
      const params = {};
      if (filterStatus !== 'All') params.status = filterStatus.toLowerCase();
      if (filterCat !== 'All') params.category = filterCat;
      if (timeRange.start) params.from_date = timeRange.start.toISOString();
      if (timeRange.end) params.to_date = timeRange.end.toISOString();

      const selectedColumns = Object.entries(exportColumns)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key);

      const blob = await exportTickets({
        ...params,
        columns: selectedColumns.join(','),
        file_format: exportFormat,
      });
      const ext = exportFormat === 'excel' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `telecomsight_export_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Make sure the backend is running.');
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <Loader size={48} style={{ marginBottom: '16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Loading feed data...</p>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="dashboard-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#e11d48' }}>
          <AlertCircle size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600 }}>Failed to load feed</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>{error}</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>Make sure the backend is running at http://127.0.0.1:8000</p>
        </div>
      </div>
    );
  }

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
            <span className="filter-label text-fade" style={{fontSize: '16px'}}>Filters:</span>
            
            {/* Category Dropdown */}
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className={`dropdown-trigger ${openDropdown === 'cat' ? 'active' : ''}`} onClick={() => toggleDropdown('cat')}>
                {filterCat === 'All' ? 'All Categories' : filterCat} <ChevronDown size={16} className="ml-1"/>
              </button>
              {openDropdown === 'cat' && (
                <div className="dropdown-menu-list stun-item">
                  {availableCategories.map(c => (
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


            {/* Platform Dropdown */}
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className={`dropdown-trigger ${openDropdown === 'plat' ? 'active' : ''}`} onClick={() => toggleDropdown('plat')}>
                {filterPlatform === 'All' ? 'Platform: All' : filterPlatform} <ChevronDown size={16} className="ml-1"/>
              </button>
              {openDropdown === 'plat' && (
                <div className="dropdown-menu-list stun-item">
                  {['All', 'Facebook', 'Instagram'].map(p => (
                    <button key={p} className={`menu-item ${filterPlatform === p ? 'active' : ''}`}
                      onClick={() => { setFilterPlatform(p); setOpenDropdown(null); }}>
                      {p === 'All' ? 'All Platforms' : p}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="filter-group ml-auto" style={{gap: '12px'}}>
             <button className="massive-time-btn hover-lift-shadow pulse-animation" onClick={() => setTimeModalOpen(true)}>
               <Calendar size={18} style={{marginRight: '8px'}}/> {activeTimePreset === 'Custom' ? 'Custom Range' : activeTimePreset}
             </button>
             <button className="export-btn hover-lift-shadow" onClick={(e) => { e.stopPropagation(); setExportModalOpen(true); }}>
               <Download size={18} style={{marginRight: '8px'}}/> Export
             </button>
          </div>
        </div>

        {/* Feed List */}
        <div className="feed-list mt-8">
          {displayedItems.map((item, index) => (
            (() => {
              const effectiveCategory = _getEffectiveCategory(item);
              const baseOptions = availableCategories.filter(c => c !== 'All');
              const categoryOptions = effectiveCategory && !baseOptions.includes(effectiveCategory)
                ? [effectiveCategory, ...baseOptions]
                : baseOptions;

              return (
            <div 
              key={item.id} 
              className={`card glass-panel hover-lift-shadow stun-item  ${item.is_urgent ? 'urgent-layer' : ''}`}
              style={{
                animationDelay: `${0.1 + ((index % 4) * 0.1)}s`, 
                borderLeft: `6px solid ${getCategoryColor(effectiveCategory)}`
              }}
            >
              {/* Platform Badge — top of card */}
              {(() => {
                const plt = (item.platform || '').toLowerCase();
                const isFB = plt.includes('facebook');
                const isIG = plt.includes('instagram');
                return (
                  <div className="feed-platform-badge-row">
                    <span className={`platform-badge-chip ${isFB ? 'facebook' : isIG ? 'instagram' : 'unknown'}`}>
                      {isFB && <FbIcon size={12} />}
                      {isIG && <IgIcon size={12} />}
                      {!isFB && !isIG && <MessageCircle size={12} />}
                      <span style={{ marginLeft: '4px' }}>{item.platform || 'Unknown'}</span>
                    </span>
                    <span className="feed-card-time text-fade">{formatDisplayTime(item.created_at)}</span>
                  </div>
                );
              })()}

              <div className="feed-card-header">
                <div className="feed-user-info">
                  <span className="feed-author">{item.author || 'Unknown'}</span>
                </div>
                
                <div className="feed-badges">
                  {item.is_urgent && (
                    <span className="badge-urgent"><AlertCircle size={16}/> HIGH URGENCY</span>
                  )}
                  <span className="badge-sla text-fade">
                    <Clock size={16}/> SLA: <span style={{color: item.status === 'breached' ? '#e11d48' : 'inherit', marginLeft: '6px'}}>{formatSLA(item.sla_deadline, item.status)}</span>
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
                    value={effectiveCategory || ''}
                    onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                  >
                    {categoryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {item.manually_corrected && (
                    <span style={{ fontSize: '11px', color: '#eab308', marginLeft: '6px', fontWeight: 700 }}>✎ corrected</span>
                  )}
                </div>

                <div className="feed-control">
                  <span className="control-label text-fade">STATUS:</span>
                  <div className="status-pill-group">
                    <button 
                      className={`status-pill larger-font ${item.status === 'open' ? 'active-open' : ''}`}
                      onClick={() => handleStatusChange(item.id, 'open')}
                    >Open</button>
                    <button 
                      className={`status-pill larger-font ${item.status === 'resolved' ? 'active-resolved' : ''}`}
                      onClick={() => handleStatusChange(item.id, 'resolved')}
                    >Resolved</button>
                    <button 
                      className={`status-pill larger-font ${item.status === 'breached' ? 'active-breached' : ''}`}
                      disabled
                    >Breached</button>
                  </div>
                </div>

                <a
                  href={_getFacebookReplyLink(item)}
                  target="_blank"
                  rel="noreferrer"
                  className="facebook-reply-btn btn-inline slide-in-btn ml-auto"
                >
                  <ExternalLink size={18} className="mr-2" style={{marginRight: '8px'}} />
                  Reply on Facebook
                </a>
              </div>
            </div>
              );
            })()
          ))}

          {filteredItems.length === 0 && !loading && (
            <div className="empty-state text-fade mt-8 stun-item" style={{textAlign: 'center', padding: '80px 60px', fontSize: '18px', lineHeight: '1.6', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)'}}>
              No feedback items match your filters for the selected time range.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-wrapper mt-8 stun-item" style={{animationDelay: '0.2s'}}>
            <div className="pagination-controls glass-panel">
              <button
                className="page-btn page-arrow"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ArrowLeft size={18} />
              </button>

              <div className="pagination-summary-group">
                <span className="pagination-summary text-fade">
                  Comments {pageStart + 1}-{Math.min(pageStart + displayedItems.length, filteredItems.length)} of {filteredItems.length}
                </span>

                <div className="pagination-jump">
                  <label className="pagination-jump-label" htmlFor="feed-page-jump">Go to page</label>
                  <div className="pagination-jump-row">
                    <input
                      id="feed-page-jump"
                      className="pagination-jump-input"
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageJumpValue}
                      onChange={(e) => setPageJumpValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePageJump();
                        }
                      }}
                    />
                    <button className="page-btn page-go-btn" onClick={handlePageJump}>
                      Go
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="page-btn page-arrow"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* --- TIME RANGE MODAL --- */}
      {isTimeModalOpen && (
        <div className="fullscreen-overlay stun-item">
          <div className="time-modal-container glass-panel fade-in-up">
            
            <div className="time-modal-header">
              <h2 className="text-primary" style={{fontSize: '32px', display: 'flex', alignItems: 'center'}}><Calendar size={32} style={{marginRight: '12px', color: 'var(--brand-blue)'}}/> Select Time Range</h2>
              <button className="modal-close-btn hover-lift" onClick={() => setTimeModalOpen(false)}><X size={32} /></button>
            </div>

            <div className="time-modal-body">
              <div className="time-preset-column">
                <h3 className="section-sub text-fade mb-4" style={{textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700'}}>Fast Filters</h3>
                <div className="preset-grid">
                  {['All Time', 'Today', 'This Week', 'This Month', 'Last Month'].map(preset => (
                    <button 
                      key={preset}
                      className={`massive-preset-btn ${activeTimePreset === preset ? 'active' : ''}`}
                      onClick={() => { setActiveTimePreset(preset); setCustomStartStr(''); setCustomEndStr(''); }}
                    >
                      {preset}
                    </button>
                  ))}
                  <button className={`massive-preset-btn ${activeTimePreset === 'Custom' ? 'active' : ''}`} onClick={() => setActiveTimePreset('Custom')}>
                    Custom Dates...
                  </button>
                </div>
              </div>

              <div className="time-custom-column">
                <h3 className="section-sub text-fade mb-4" style={{textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700'}}>Manual Constraint</h3>
                <div className={`${activeTimePreset !== 'Custom' ? 'disabled-area' : ''}`}>
                  <div className="date-input-group">
                    <label>Start Date</label>
                    <input type="date" className="massive-date-input" max={todayStr} value={customStartStr} onChange={(e) => { setActiveTimePreset('Custom'); setCustomStartStr(e.target.value); }} />
                  </div>
                  <div className="date-input-group" style={{marginTop: '24px'}}>
                    <label>End Date (Max Today)</label>
                    <input type="date" className="massive-date-input" max={todayStr} value={customEndStr} onChange={(e) => { setActiveTimePreset('Custom'); setCustomEndStr(e.target.value); }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="time-modal-footer">
              <button className="massive-apply-btn hover-lift-shadow" onClick={handleApplyTimeFilter}>Apply Filter &amp; Return</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT MODAL --- */}
      {isExportModalOpen && (
        <div className="fullscreen-overlay stun-item" onClick={() => setExportModalOpen(false)}>
          <div className="export-modal-container glass-panel fade-in-up" onClick={e => e.stopPropagation()}>

            <div className="time-modal-header">
              <h2 className="text-primary" style={{fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                <Download size={28} style={{color: 'var(--brand-blue)'}}/> Export Comments
              </h2>
              <button className="modal-close-btn hover-lift" onClick={() => setExportModalOpen(false)}><X size={28} /></button>
            </div>

            <div className="export-modal-body">

              {/* Column Selection */}
              <div className="export-section">
                <h3 className="export-section-title">Columns to Include</h3>
                <div className="export-columns-grid">
                  {[
                    { key: 'customerName', label: 'Customer Name' },
                    { key: 'dateTime',     label: 'Date & Time' },
                    { key: 'commentText',  label: 'Comment Text' },
                    { key: 'isUrgent', label: 'Urgent Comment' },
                    { key: 'category',     label: 'Category' },
                    { key: 'status',       label: 'Status' },
                    { key: 'slaValue',     label: 'SLA Value' },
                    { key: 'platform',     label: 'Platform' },
                  ].map(col => (
                    <label key={col.key} className={`export-checkbox-item ${exportColumns[col.key] ? 'checked' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={exportColumns[col.key]} 
                        onChange={() => toggleExportColumn(col.key)}
                        style={{display: 'none'}}
                      />
                      <span className="export-checkbox-box">{exportColumns[col.key] && '✓'}</span>
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filter note */}
              <div className="export-filter-note">
                <FileText size={16} style={{marginRight: '8px', color: 'var(--brand-blue)', flexShrink: 0}}/>
                Exporting <strong style={{color: 'white', margin: '0 4px'}}>{filteredItems.length}</strong> comment{filteredItems.length !== 1 ? 's' : ''} matching current filters.
              </div>

              {/* Format Selection */}
              <div className="export-section">
                <h3 className="export-section-title">Export Format</h3>
                <div style={{display: 'flex', gap: '16px'}}>
                  <button 
                    className={`export-format-btn ${exportFormat === 'csv' ? 'active' : ''}`}
                    onClick={() => setExportFormat('csv')}
                  >
                    <FileText size={24} style={{marginBottom: '8px'}}/>
                    CSV
                    <span style={{fontSize: '13px', opacity: 0.6, display: 'block'}}>Comma-separated</span>
                  </button>
                  <button 
                    className={`export-format-btn ${exportFormat === 'excel' ? 'active' : ''}`}
                    onClick={() => setExportFormat('excel')}
                  >
                    <Download size={24} style={{marginBottom: '8px'}}/>
                    Excel
                    <span style={{fontSize: '13px', opacity: 0.6, display: 'block'}}>.xlsx format</span>
                  </button>
                </div>
              </div>

            </div>

            <div className="export-modal-footer">
              <button className="massive-preset-btn" onClick={() => setExportModalOpen(false)} style={{minWidth: '140px'}}>
                Cancel
              </button>
              <button 
                className="massive-apply-btn hover-lift-shadow" 
                onClick={handleExportNow}
                disabled={!Object.values(exportColumns).some(Boolean) || filteredItems.length === 0}
                style={{minWidth: '180px'}}
              >
                <Download size={18} style={{marginRight: '8px'}} />
                Export Now
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
