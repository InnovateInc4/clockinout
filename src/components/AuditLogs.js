import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuditLogs = ({ config }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchLogs = () => {
    setLoading(true);
    axios.get('/api/audit-logs/all', config)
      .then(res => {
        setLogs(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching audit logs:', err);
        showMessage('Could not load audit logs', 'error');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const clearLogs = () => {
    if (!window.confirm('Clear ALL audit logs? This cannot be undone.')) return;
    axios.delete('/api/audit-logs/clear', config)
      .then(() => {
        showMessage('Audit logs cleared');
        fetchLogs();
      })
      .catch(err => {
        console.error(err);
        showMessage('Error clearing logs', 'error');
      });
  };

  // Group actions into categories
  const actionCategory = (action) => {
    if (!action) return 'other';
    if (action.startsWith('ADD_')) return 'add';
    if (action.startsWith('EDIT_') || action.startsWith('UPDATE_')) return 'edit';
    if (action.startsWith('DELETE_')) return 'delete';
    if (action.startsWith('DEACTIVATE_')) return 'deactivate';
    if (action.startsWith('REACTIVATE_')) return 'reactivate';
    return 'other';
  };

  const categoryColors = {
    add:        { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    edit:       { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    delete:     { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
    deactivate: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
    reactivate: { bg: '#ecfccb', color: '#4d7c0f', border: '#d9f99d' },
    other:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
  };

  const actionIcon = (action) => {
    const cat = actionCategory(action);
    return {
      add: '➕',
      edit: '✎',
      delete: '🗑',
      deactivate: '⏻',
      reactivate: '↻',
      other: '•'
    }[cat];
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  // Extract all unique action types for the filter
  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort();

  // Apply search + filter
  const filtered = logs.filter(log => {
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const haystack = `${log.action} ${log.performed_by} ${log.details}`.toLowerCase();
    const matchSearch = !search || haystack.includes(search.toLowerCase());
    return matchAction && matchSearch;
  });

  // ---------- STYLES ----------
  const card = {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px'
  };

  const label = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '6px'
  };

  const input = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '0.9rem',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div>

      {/* MESSAGE */}
      {message && (
        <div style={{
          padding: '12px 18px',
          marginBottom: '18px',
          borderRadius: '10px',
          backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: message.type === 'error' ? '#b91c1c' : '#15803d',
          fontWeight: '700',
          fontSize: '0.85rem',
          border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {message.text}
        </div>
      )}

      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>
            Audit Logs
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {filtered.length} of {logs.length} action{logs.length === 1 ? '' : 's'} shown
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            style={{
              padding: '12px 22px',
              borderRadius: '8px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🗑 Clear All Logs
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div style={{ ...card, padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={label}>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={input}
              placeholder="Search details, action, user..."
            />
          </div>
          <div>
            <label style={label}>Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={input}
            >
              <option value="all">All actions</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading audit logs...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📝</div>
            <p style={{ margin: 0 }}>
              {logs.length === 0
                ? 'No audit activity yet. Once you add or edit employees, documents, or certificates, actions will appear here.'
                : 'No logs match your current filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={th}>Action</th>
                  <th style={th}>Performed By</th>
                  <th style={th}>Details</th>
                  <th style={{ ...th, textAlign: 'right' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const cat = actionCategory(log.action);
                  const colors = categoryColors[cat];
                  return (
                    <tr key={log.id} style={{
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <td style={td}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: colors.bg,
                          color: colors.color,
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          border: `1px solid ${colors.border}`,
                          whiteSpace: 'nowrap'
                        }}>
                          <span>{actionIcon(log.action)}</span>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#475569', fontWeight: '600' }}>
                        {log.performed_by || '—'}
                      </td>
                      <td style={{ ...td, color: '#0f172a' }}>
                        {log.details || '—'}
                      </td>
                      <td style={{
                        ...td,
                        color: '#64748b',
                        fontSize: '0.8rem',
                        textAlign: 'right',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatTimestamp(log.created_at)}
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

const th = {
  padding: '14px 18px',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: '800',
  color: '#f8fafc',
  letterSpacing: '1.2px',
  textTransform: 'uppercase'
};

const td = {
  padding: '14px 18px',
  fontSize: '0.85rem',
  verticalAlign: 'top'
};

export default AuditLogs;