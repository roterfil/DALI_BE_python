import { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../../api/api';

const timeCutoff = (range) => {
  const now = Date.now();
  if (range === '24h') return now - 24 * 60 * 60 * 1000;
  if (range === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  if (range === '30d') return now - 30 * 24 * 60 * 60 * 1000;
  return 0; // all time
};

const formatPrice = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₱${n.toFixed(2)}`;
};

const AuditBadge = ({ action }) => {
  const a = (action || '').toLowerCase();
  let cls = 'info';
  if (a.includes('price')) cls = 'price';
  else if (a.includes('stock')) cls = 'stock';
  
  return <span className={`audit-badge badge-${cls}`}>{action.replace(/_/g, ' ')}</span>;
};

const AdminAudit = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [range, setRange] = useState('30d');

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAudit({ limit: 1000 });
      setAudits(res.data || []);
    } catch (e) {
      console.error('fetch audits', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudits(); }, []);

  const stats = useMemo(() => {
    const total = audits.length;
    const price = audits.filter(a => (a.action || '').toLowerCase().includes('price')).length;
    const stock = audits.filter(a => (a.action || '').toLowerCase().includes('stock')).length;
    return { total, price, stock };
  }, [audits]);

  const filtered = useMemo(() => {
    const cutoff = timeCutoff(range);
    return audits.filter((a) => {
      if (!a) return false;
      
      // Time Filter
      if (cutoff && a.created_at) {
        const t = new Date(a.created_at).getTime();
        if (t < cutoff) return false;
      }
      
      // Event Type Filter
      if (eventFilter !== 'all') {
        const act = (a.action || '').toLowerCase();
        if (eventFilter === 'price' && !act.includes('price')) return false;
        if (eventFilter === 'stock' && !act.includes('stock')) return false;
      }
      
      // Search Filter
      if (q && q.trim()) {
        const s = q.trim().toLowerCase();
        let detailsStr = '';
        try { 
            detailsStr = a.details ? JSON.stringify(typeof a.details === 'string' ? JSON.parse(a.details) : a.details) : ''; 
        } catch { 
            detailsStr = String(a.details || ''); 
        }
        
        const hay = `${a.actor_email || ''} ${a.entity_type || ''} ${a.entity_id || ''} ${detailsStr}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).sort((x,y)=> new Date(y.created_at) - new Date(x.created_at));
  }, [audits, q, eventFilter, range]);

  return (
    <div className="admin-audit-page">
      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon audit-total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Events</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon audit-price">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.price}</h3>
            <p>Price Changes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon audit-stock">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.stock}</h3>
            <p>Stock Adjustments</p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="audit-controls">
        <div className="audit-search-wrapper">
          <input 
            className="main-search-input" 
            style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '10px 15px', fontSize: '0.9rem' }}
            placeholder="Search by SKU, Product Name, or User Email..." 
            value={q} 
            onChange={e=>setQ(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="audit-filter-select" value={eventFilter} onChange={e=>setEventFilter(e.target.value)}>
            <option value="all">All Event Types</option>
            <option value="price">Price Changes</option>
            <option value="stock">Stock Updates</option>
          </select>

          <div className="time-filter-group" style={{ display: 'flex' }}>
            {['24h','7d','30d','all'].map(r=> (
              <button 
                key={r} 
                className={`time-filter-btn ${range===r? 'active':''}`} 
                onClick={()=>setRange(r)}
              >
                {r==='all'?'All Time':r.toUpperCase()}
              </button>
            ))}
          </div>

          <button className="btn btn-secondary btn-small" onClick={fetchAudits} style={{ marginLeft: 10 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="audit-table-wrapper">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>No audit records found matching your criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dali-audit-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Timestamp</th>
                  <th style={{ width: '20%' }}>User</th>
                  <th style={{ width: '10%' }}>Action</th>
                  <th style={{ width: '25%' }}>Product / SKU</th>
                  <th style={{ width: '10%' }}>Before</th>
                  <th style={{ width: '10%' }}>After</th>
                  <th style={{ width: '10%' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  let details = {};
                  try { 
                    details = a.details ? (typeof a.details === 'string' ? JSON.parse(a.details) : a.details) : {}; 
                  } catch { 
                    details = { raw: a.details }; 
                  }
                  
                  const actor = details.actor_name || a.actor_email || 'System';
                  const product = details.product_name || details.product_title || details.name || details.product || details.title || details.sku || `${a.entity_type || 'Item'} ${a.entity_id? `#${a.entity_id}`:''}`;
                  
                  // Extract values based on naming conventions
                  const before = details.before ?? details.old_value ?? details.old_price ?? details.old_stock ?? '';
                  const after = details.after ?? details.new_value ?? details.new_price ?? details.new_stock ?? '';
                  const isPrice = (a.action || '').toLowerCase().includes('price');

                  const delta = (()=>{
                    if (before === '' || after === '') return '';
                    const nb = Number(before); const na = Number(after);
                    if (!Number.isNaN(nb) && !Number.isNaN(na)) return (na - nb);
                    return '';
                  })();

                  return (
                    <tr key={a.audit_id}>
                      <td style={{ color: '#666', fontSize: '0.85rem' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleString('en-PH', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        }) : ''}
                      </td>
                      <td>
                        <div className="audit-user-cell">
                          <div className="audit-avatar">
                            {(actor||'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="audit-user-info">
                             <div>{actor.split('@')[0]}</div>
                             {a.actor_email && <div>{a.actor_email}</div>}
                          </div>
                        </div>
                      </td>
                      <td><AuditBadge action={a.action || ''} /></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#333' }}>{product}</div>
                        {details.sku && <div style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>SKU: {details.sku}</div>}
                      </td>
                      <td className="diff-val">
                        {isPrice ? formatPrice(before) : String(before||'—')}
                      </td>
                      <td className="diff-val">
                        {isPrice ? formatPrice(after) : String(after||'—')}
                      </td>
                      <td className="diff-val">
                        {delta !== '' ? (
                          <span className={delta > 0 ? 'diff-up' : delta < 0 ? 'diff-down' : 'diff-neutral'}>
                            {delta > 0 ? '↑ ' : delta < 0 ? '↓ ' : ''}
                            {Math.abs(delta)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAudit;