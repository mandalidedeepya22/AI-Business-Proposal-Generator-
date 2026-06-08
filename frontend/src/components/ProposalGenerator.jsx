import React, { useState } from 'react';
import { 
  Sparkles, FileText, DollarSign, Calendar, AlertTriangle, 
  Layers, Download, Plus, Trash, Loader2, LogOut, ShieldAlert
} from 'lucide-react';

export default function ProposalGenerator({ token, user, onLogout, setView }) {
  // Form Inputs
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState(['']);
  const [budgetRange, setBudgetRange] = useState('$10,000 - $25,000');
  const [timelinePref, setTimelinePref] = useState('8 weeks');
  
  // Loading & Generation States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  
  // Generated Proposal Data
  const [proposal, setProposal] = useState(null);
  const [activeTab, setActiveTab] = useState('sow');

  // API Config
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const addDeliverable = () => setDeliverables([...deliverables, '']);
  const removeDeliverable = (index) => {
    const next = [...deliverables];
    next.splice(index, 1);
    setDeliverables(next);
  };
  const updateDeliverable = (index, value) => {
    const next = [...deliverables];
    next[index] = value;
    setDeliverables(next);
  };

  const startLoadingSimulation = () => {
    const steps = [
      "Analyzing requirements & performing semantic context search...",
      "Drafting Statement of Work (SOW)...",
      "Estimating pricing breakdown...",
      "Structuring timeline & phases...",
      "Identifying risks & mitigation strategies...",
      "Compiling final technical architecture proposal..."
    ];
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1800);
    return interval;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe your project requirements.");
      return;
    }

    setLoading(true);
    setError('');
    setProposal(null);
    const interval = startLoadingSimulation();

    try {
      const filteredDeliverables = deliverables.filter(d => d.trim() !== '').join(', ');
      const response = await fetch(`${API_BASE}/api/generate-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description,
          deliverables: filteredDeliverables || "General software development implementation",
          budget_range: budgetRange,
          timeline_preferences: timelinePref
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to generate proposal");
      }

      const data = await response.json();
      setProposal(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Export Helpers
  const exportToPDF = () => {
    if (!proposal) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${proposal.title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
            h2 { color: #1e3a8a; margin-top: 30px; border-bottom: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #ddd; }
            td { padding: 10px; border: 1px solid #ddd; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; }
            .high { background-color: #fee2e2; color: #991b1b; }
            .medium { background-color: #fef3c7; color: #92400e; }
            .low { background-color: #d1fae5; color: #065f46; }
          </style>
        </head>
        <body>
          <h1>${proposal.title}</h1>
          
          <h2>1. Statement of Work (SOW)</h2>
          <div style="white-space: pre-wrap;">${proposal.sow || proposal.content}</div>
          
          <h2>2. Pricing Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Details</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.pricing.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.details}</td>
                  <td>$${item.cost.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold;">
                <td colspan="2">Total Project Cost</td>
                <td>$${proposal.pricing.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <h2>3. Project Timeline (Schedule)</h2>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Start Week</th>
                <th>End Week</th>
                <th>Deliverables</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.timeline.map(p => `
                <tr>
                  <td>${p.phase}</td>
                  <td>Week ${p.start_week}</td>
                  <td>Week ${p.end_week}</td>
                  <td>${p.deliverables}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>4. Risk Mitigation Assessment</h2>
          <table>
            <thead>
              <tr>
                <th>Risk Factor</th>
                <th>Severity</th>
                <th>Mitigation Strategy</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.risks.map(r => `
                <tr>
                  <td>${r.risk}</td>
                  <td><span class="badge ${r.severity.toLowerCase()}">${r.severity}</span></td>
                  <td>${r.mitigation}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>5. Technical Architecture</h2>
          <div style="white-space: pre-wrap;">${proposal.architecture || ''}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToDOCX = () => {
    if (!proposal) return;
    
    // Create Microsoft Word compatible HTML file download (.doc)
    const contentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${proposal.title}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #1e3a8a; font-size: 24pt; border-bottom: 2px solid #1e3a8a; }
            h2 { color: #1e3a8a; font-size: 16pt; margin-top: 20pt; }
            table { width: 100%; border-collapse: collapse; }
            th { background-color: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #ddd; }
            td { padding: 8px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>${proposal.title}</h1>
          <h2>1. Statement of Work (SOW)</h2>
          <p>${(proposal.sow || proposal.content).replace(/\n/g, '<br/>')}</p>
          
          <h2>2. Pricing Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Details</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.pricing.map(item => `
                <tr>
                  <td>${item.category}</td>
                  <td>${item.details}</td>
                  <td>$${item.cost}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold;">
                <td colspan="2">Total</td>
                <td>$${proposal.pricing.reduce((sum, item) => sum + item.cost, 0)}</td>
              </tr>
            </tbody>
          </table>

          <h2>3. Timeline</h2>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Weeks</th>
                <th>Deliverables</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.timeline.map(p => `
                <tr>
                  <td>${p.phase}</td>
                  <td>Week ${p.start_week} - ${p.end_week}</td>
                  <td>${p.deliverables}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>4. Risks</h2>
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Severity</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              ${proposal.risks.map(r => `
                <tr>
                  <td>${r.risk}</td>
                  <td>${r.severity}</td>
                  <td>${r.mitigation}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>5. Technical Architecture</h2>
          <p>${(proposal.architecture || '').replace(/\n/g, '<br/>')}</p>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${proposal.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stepsList = [
    "Analyzing requirements & context...",
    "Drafting Statement of Work...",
    "Estimating pricing model...",
    "Structuring timeline schedule...",
    "Identifying risks mitigation...",
    "Designing technical architecture..."
  ];

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      
      {/* Top Navbar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px', boxShadow: '0 0 15px var(--primary-glow)' }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', background: 'linear-gradient(90deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PROPOSAL.AI
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Welcome, {user.username}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {user.role === 'admin' && (
            <button className="btn btn-secondary" onClick={() => setView('admin')} style={{ fontSize: '0.85rem' }}>
              <ShieldAlert size={16} /> Admin Dashboard
            </button>
          )}
          <button className="btn btn-danger" onClick={onLogout} style={{ fontSize: '0.85rem' }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: proposal ? '420px 1fr' : '1fr', gap: '30px', alignItems: 'start', transition: 'var(--transition-smooth)' }}>
        
        {/* Requirement Intake Form */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--primary)" /> Project Intake
          </h2>
          
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label className="form-label">Project Description</label>
              <textarea 
                className="form-input" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to build (e.g. Build an e-commerce platform with stripe integration, user profiles, and product catalog...)"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Key Deliverables 
                <button type="button" onClick={addDeliverable} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <Plus size={14} /> Add
                </button>
              </label>
              {deliverables.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input"
                    value={item}
                    onChange={(e) => updateDeliverable(idx, e.target.value)}
                    placeholder={`Deliverable #${idx + 1}`}
                  />
                  {deliverables.length > 1 && (
                    <button type="button" onClick={() => removeDeliverable(idx)} style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', padding: '0 10px', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Budget Range</label>
                <select className="form-input" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}>
                  <option value="$5,000 - $10,000">$5k - $10k</option>
                  <option value="$10,000 - $25,000">$10k - $25k</option>
                  <option value="$25,000 - $50,000">$25k - $50k</option>
                  <option value="$50,000 - $100,000">$50k - $100k</option>
                  <option value="$100,000+">$100k+</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Timeline Preferences</label>
                <select className="form-input" value={timelinePref} onChange={(e) => setTimelinePref(e.target.value)}>
                  <option value="4 weeks">4 weeks</option>
                  <option value="8 weeks">8 weeks</option>
                  <option value="12 weeks">12 weeks</option>
                  <option value="16 weeks">16 weeks</option>
                  <option value="6 months+">6 months+</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '15px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Generating Proposal...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate Proposal
                </>
              )}
            </button>
          </form>
        </div>

        {/* Output Panel / Loading Panel */}
        {loading && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', minHeight: '400px' }}>
            <Loader2 className="animate-spin" size={50} color="var(--primary)" style={{ marginBottom: '24px', animation: 'spin 1.5s linear infinite' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>Orchestrating AI Pipeline</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '30px', textAlign: 'center' }}>
              Creating customized artifacts... Please wait.
            </p>
            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stepsList.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: idx < loadingStep ? 0.4 : (idx === loadingStep ? 1 : 0.2), transition: 'var(--transition-smooth)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === loadingStep ? 'var(--primary)' : (idx < loadingStep ? 'var(--secondary)' : 'var(--text-muted)') }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: idx === loadingStep ? '600' : 'normal' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {proposal && !loading && (
          <div className="glass-panel" style={{ padding: '30px', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '6px' }}>Draft ID: #{proposal.id}</span>
                <h2 style={{ fontSize: '1.6rem', color: '#fff' }}>{proposal.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={exportToPDF} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <Download size={14} /> PDF
                </button>
                <button className="btn btn-secondary" onClick={exportToDOCX} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <Download size={14} /> DOCX (Word)
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-nav">
              <button className={`tab-btn ${activeTab === 'sow' ? 'active' : ''}`} onClick={() => setActiveTab('sow')}>
                <FileText size={16} /> SOW
              </button>
              <button className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => setActiveTab('pricing')}>
                <DollarSign size={16} /> Pricing
              </button>
              <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
                <Calendar size={16} /> Timeline
              </button>
              <button className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`} onClick={() => setActiveTab('risks')}>
                <AlertTriangle size={16} /> Risks
              </button>
              <button className={`tab-btn ${activeTab === 'architecture' ? 'active' : ''}`} onClick={() => setActiveTab('architecture')}>
                <Layers size={16} /> Architecture
              </button>
            </div>

            {/* Tab Panels */}
            <div style={{ marginTop: '20px', minHeight: '300px' }}>
              {activeTab === 'sow' && (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: 'var(--text-primary)', fontSize: '0.975rem' }}>
                  {proposal.sow}
                </div>
              )}

              {activeTab === 'pricing' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Pricing & Billing Breakdown</h3>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Details</th>
                        <th style={{ textAlign: 'right' }}>Estimated Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.pricing.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{item.category}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{item.details}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--secondary)' }}>
                            ${item.cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(0, 0, 0, 0.2)', fontWeight: 'bold' }}>
                        <td colspan="2">Total Project Fee</td>
                        <td style={{ textAlign: 'right', fontSize: '1.1rem', color: '#fff' }}>
                          ${proposal.pricing.reduce((acc, item) => acc + item.cost, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Timeline & Gantt Visualizer</h3>
                  <div className="gantt-chart">
                    <div className="gantt-header">
                      <div className="gantt-label-col">Phase Name</div>
                      <div className="gantt-timeline-cols">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(wk => (
                          <div key={wk} className="gantt-week-label">W{wk}</div>
                        ))}
                      </div>
                    </div>
                    {proposal.timeline.map((p, idx) => {
                      const start = p.start_week || 1;
                      const end = p.end_week || 12;
                      const duration = end - start + 1;
                      const colorClass = `gantt-bar-color-${(idx % 4) + 1}`;
                      
                      // Calculate percentage placement
                      const leftPercent = ((start - 1) / 12) * 100;
                      const widthPercent = (duration / 12) * 100;

                      return (
                        <div key={idx} className="gantt-row">
                          <div className="gantt-row-label">
                            <div style={{ fontWeight: '600' }}>{p.phase}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {p.deliverables}
                            </div>
                          </div>
                          <div className="gantt-track">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(wk => (
                              <div key={wk} className="gantt-grid-line" style={{ left: `${((wk - 1) / 12) * 100}%` }} />
                            ))}
                            <div 
                              className={`gantt-bar ${colorClass}`}
                              style={{ 
                                left: `${leftPercent}%`, 
                                width: `${widthPercent}%` 
                              }}
                              title={`${p.phase}: Week ${start} to ${end}`}
                            >
                              W{start} - W{end}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'risks' && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Risk Mitigation Strategy</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                    {proposal.risks.map((r, idx) => {
                      const severityClass = 
                        r.severity.toLowerCase() === 'high' ? 'badge-high' : 
                        (r.severity.toLowerCase() === 'medium' ? 'badge-medium' : 'badge-low');
                      return (
                        <div key={idx} className="glass-panel" style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{r.risk}</span>
                            <span className={`badge ${severityClass}`}>{r.severity}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                            <strong style={{ color: '#fff', fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Mitigation Plan:</strong>
                            {r.mitigation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'architecture' && (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: 'var(--text-primary)', fontSize: '0.975rem' }}>
                  {proposal.architecture}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
