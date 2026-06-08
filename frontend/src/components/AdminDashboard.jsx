import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Trash2, Eye, Shield, Users, BarChart2, 
  Layers, Clock, RefreshCw, X, Download, AlertTriangle
} from 'lucide-react';

export default function AdminDashboard({ token, onBack }) {
  const [proposals, setProposals] = useState([]);
  const [users, setUsers] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  
  // UI Control States
  const [activeSubTab, setActiveSubTab] = useState('registry'); // 'registry' | 'monitoring' | 'users'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // API Config
  const API_BASE = 'http://localhost:8000';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch Proposals
      const pRes = await fetch(`${API_BASE}/api/proposals`, { headers });
      if (!pRes.ok) throw new Error("Failed to fetch proposals");
      const pData = await pRes.json();
      setProposals(pData);

      // Fetch Users (Admin only)
      const uRes = await fetch(`${API_BASE}/api/users`, { headers });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData);
      }

      // Fetch Usage Telemetry
      const mRes = await fetch(`${API_BASE}/api/monitoring/usage`, { headers });
      if (mRes.ok) {
        const mData = await mRes.json();
        setUsageStats(mData);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard metrics. Ensure backend and DB are active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleDeleteProposal = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this proposal? This cannot be undone.")) return;

    try {
      const response = await fetch(`${API_BASE}/api/proposals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Delete failed");
      
      // Update local state
      setProposals(proposals.filter(p => p.id !== id));
    } catch (err) {
      alert("Error deleting proposal: " + err.message);
    }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change user role to ${nextRole}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: nextRole })
      });
      if (!response.ok) throw new Error("Role update failed");
      
      // Refresh user list
      setUsers(users.map(u => u.id === userId ? { ...u, role: nextRole } : u));
    } catch (err) {
      alert("Error updating role: " + err.message);
    }
  };

  // Export from Modal
  const exportFromModal = (format) => {
    if (!selectedProposal) return;
    
    // Create print stylesheet/element
    const printWindow = window.open('', '_blank');
    const pricing = typeof selectedProposal.pricing === 'string' ? JSON.parse(selectedProposal.pricing) : selectedProposal.pricing;
    const timeline = typeof selectedProposal.timeline === 'string' ? JSON.parse(selectedProposal.timeline) : selectedProposal.timeline;
    const risks = typeof selectedProposal.risks === 'string' ? JSON.parse(selectedProposal.risks) : selectedProposal.risks;
    
    const docHtml = `
      <html>
        <head>
          <title>${selectedProposal.title}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; }
            h2 { color: #1e3a8a; margin-top: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #ddd; }
            td { padding: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>${selectedProposal.title}</h1>
          <h2>Content</h2>
          <div style="white-space: pre-wrap;">${selectedProposal.content}</div>
          
          <h2>Pricing Breakdown</h2>
          <table>
            <thead>
              <tr><th>Category</th><th>Details</th><th>Cost</th></tr>
            </thead>
            <tbody>
              ${pricing.map(item => `
                <tr><td>${item.category}</td><td>${item.details}</td><td>$${item.cost.toLocaleString()}</td></tr>
              `).join('')}
            </tbody>
          </table>
          
          <h2>Timeline Schedule</h2>
          <table>
            <thead>
              <tr><th>Phase</th><th>Start Week</th><th>End Week</th><th>Deliverables</th></tr>
            </thead>
            <tbody>
              ${timeline.map(p => `
                <tr><td>${p.phase}</td><td>W${p.start_week}</td><td>W${p.end_week}</td><td>${p.deliverables}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    if (format === 'pdf') {
      printWindow.document.write(docHtml);
      printWindow.document.close();
      printWindow.print();
    } else {
      // DOCX download
      const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedProposal.title.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredProposals = proposals.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      
      {/* Back button header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Generator
        </button>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Shield size={20} color="var(--accent)" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Admin Console</h1>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--danger)', padding: '15px', borderRadius: '12px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Analytics KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99,102,241,0.15)', padding: '14px', borderRadius: '12px' }}>
            <Layers size={28} color="var(--primary)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Proposals</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{proposals.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.15)', padding: '14px', borderRadius: '12px' }}>
            <Users size={28} color="var(--secondary)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Users</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{users.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(217,70,239,0.15)', padding: '14px', borderRadius: '12px' }}>
            <Clock size={28} color="var(--accent)" />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System API Requests</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{usageStats?.total_requests || 0}</div>
          </div>
        </div>
      </div>

      {/* Inner Dashboard Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button className={`tab-btn ${activeSubTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveSubTab('registry')}>
          Proposal Registry
        </button>
        <button className={`tab-btn ${activeSubTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveSubTab('monitoring')}>
          API Usage Logs
        </button>
        <button className={`tab-btn ${activeSubTab === 'users' ? 'active' : ''}`} onClick={() => setActiveSubTab('users')}>
          User Directory
        </button>
      </div>

      {/* Tab: Proposal Registry */}
      {activeSubTab === 'registry' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Saved Proposal List</h3>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '40px' }} 
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Proposal Title</th>
                  <th>Date Created</th>
                  <th>Estimated Price</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.length > 0 ? (
                  filteredProposals.map(p => {
                    const pricing = typeof p.pricing === 'string' ? JSON.parse(p.pricing) : p.pricing;
                    const totalCost = pricing ? pricing.reduce((sum, item) => sum + item.cost, 0) : 0;
                    return (
                      <tr key={p.id} onClick={() => setSelectedProposal(p)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: 'var(--text-secondary)', width: '60px' }}>#{p.id}</td>
                        <td style={{ fontWeight: '600' }}>{p.title}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>${totalCost.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                              <Eye size={14} /> View
                            </button>
                            <button className="btn btn-danger" onClick={(e) => handleDeleteProposal(p.id, e)} style={{ padding: '6px 10px' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colspan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                      No proposals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: API Usage Monitoring */}
      {activeSubTab === 'monitoring' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="var(--primary)" /> API Traffic Analytics
            </h3>
            
            {/* SVG Usage Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '20px', border: '1px solid var(--glass-border)' }}>
              <svg viewBox="0 0 800 200" style={{ width: '100%', height: '180px' }}>
                {/* Horizontal gridlines */}
                <line x1="50" y1="20" x2="750" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                <line x1="50" y1="80" x2="750" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                <line x1="50" y1="140" x2="750" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="5,5" />
                <line x1="50" y1="180" x2="750" y2="180" stroke="rgba(255,255,255,0.2)" />
                
                {/* Chart line representing request volume */}
                <path 
                  d="M 50 180 Q 150 120, 250 140 T 450 70 T 650 130 T 750 60" 
                  fill="none" 
                  stroke="var(--primary)" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                
                {/* Sparkle/Glow path */}
                <path 
                  d="M 50 180 Q 150 120, 250 140 T 450 70 T 650 130 T 750 60 L 750 180 L 50 180 Z" 
                  fill="url(#grad)" 
                  opacity="0.1"
                />

                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>

                {/* Data points */}
                <circle cx="250" cy="140" r="5" fill="var(--info)" />
                <circle cx="450" cy="70" r="5" fill="var(--accent)" />
                <circle cx="750" cy="60" r="5" fill="var(--primary)" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '700px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                <span>00:00 (EST)</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Request logs */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Real-time Server Call Log</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ marginTop: '0' }}>
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>API Endpoint</th>
                    <th>User identity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usageStats && usageStats.logs && usageStats.logs.length > 0 ? (
                    usageStats.logs.map((log, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{new Date(log.timestamp).toISOString()}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--info)' }}>{log.endpoint}</td>
                        <td>{log.user}</td>
                        <td><span className="badge badge-low">Success</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colspan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                        No logs recorded yet. Run a proposal generation to log access traffic.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: User Management */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>System Access & Roles</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Created Date</th>
                  <th>Assigned Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>#{u.id}</td>
                    <td style={{ fontWeight: '600' }}>{u.username}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-high' : 'badge-info'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleRoleToggle(u.id, u.role)}
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      >
                        Toggle Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Proposal Details Modal */}
      {selectedProposal && (
        <div className="modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ animation: 'fadeIn 0.25s ease-out' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '15px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>Proposal #{selectedProposal.id}</span>
                <h2 style={{ fontSize: '1.5rem' }}>{selectedProposal.title}</h2>
              </div>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setSelectedProposal(null)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal actions */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="btn btn-secondary" onClick={() => exportFromModal('pdf')}>
                <Download size={14} /> Export PDF
              </button>
              <button className="btn btn-secondary" onClick={() => exportFromModal('docx')}>
                <Download size={14} /> Export Word
              </button>
            </div>

            {/* Structured details inside modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '8px' }}>Statement of Work & Description</h3>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                  {selectedProposal.content}
                </div>
              </div>

              {/* Pricing Visualization (SVG Bar Chart) */}
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '12px' }}>Pricing Visualization</h3>
                {selectedProposal.pricing && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(typeof selectedProposal.pricing === 'string' ? JSON.parse(selectedProposal.pricing) : selectedProposal.pricing).map((item, idx) => {
                        const total = (typeof selectedProposal.pricing === 'string' ? JSON.parse(selectedProposal.pricing) : selectedProposal.pricing)
                          .reduce((sum, it) => sum + it.cost, 0);
                        const percent = total > 0 ? (item.cost / total) * 100 : 0;
                        return (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                              <span>{item.category} ({item.details})</span>
                              <strong style={{ color: 'var(--secondary)' }}>${item.cost.toLocaleString()} ({percent.toFixed(0)}%)</strong>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--secondary)' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Assessment Table */}
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '12px' }}>Risk Assessment Table</h3>
                {selectedProposal.risks && (
                  <table className="custom-table" style={{ marginTop: '0' }}>
                    <thead>
                      <tr>
                        <th>Risk</th>
                        <th>Severity</th>
                        <th>Mitigation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(typeof selectedProposal.risks === 'string' ? JSON.parse(selectedProposal.risks) : selectedProposal.risks).map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{r.risk}</td>
                          <td>
                            <span className={`badge ${r.severity.toLowerCase() === 'high' ? 'badge-high' : (r.severity.toLowerCase() === 'medium' ? 'badge-medium' : 'badge-low')}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.mitigation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', pt: '10px', borderTop: '1px solid var(--glass-border)' }}>
              <button className="btn btn-primary" onClick={() => setSelectedProposal(null)}>
                Close Viewer
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
