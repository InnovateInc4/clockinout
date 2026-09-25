import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CertificateTracker = ({ config }) => {
  const [certificates, setCertificates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const emptyForm = {
    employee_id: '',
    certificate_name: '',
    issue_date: '',
    expiry_date: ''
  };

  const [form, setForm] = useState(emptyForm);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchCertificates = () => {
    setLoading(true);
    axios.get('/api/certificates/all', config)
      .then(res => {
        setCertificates(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching certificates:', err);
        showMessage('Could not load certificates', 'error');
        setLoading(false);
      });
  };

  const fetchEmployees = () => {
    axios.get('/api/users/all-employees', config)
      .then(res => setEmployees(res.data))
      .catch(err => console.error('Error fetching employees:', err));
  };

  useEffect(() => {
    fetchCertificates();
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.employee_id || !form.certificate_name || !form.expiry_date) {
      showMessage('Employee, certificate name and expiry date are required', 'error');
      return;
    }

    if (editingId) {
      axios.put(`/api/certificates/update/${editingId}`, form, config)
        .then(() => {
          showMessage('Certificate updated successfully');
          resetForm();
          fetchCertificates();
        })
        .catch(err => {
          console.error(err);
          showMessage('Error updating certificate', 'error');
        });
    } else {
      axios.post('/api/certificates/add', form, config)
        .then(() => {
          showMessage('Certificate added successfully');
          resetForm();
          fetchCertificates();
        })
        .catch(err => {
          console.error(err);
          showMessage(err.response?.data?.error || 'Error adding certificate', 'error');
        });
    }
  };

  const startEdit = (cert) => {
    setEditingId(cert.id);
    setShowAddForm(true);
    setForm({
      employee_id: cert.employee_id,
      certificate_name: cert.certificate_name,
      issue_date: cert.issue_date ? cert.issue_date.split('T')[0] : '',
      expiry_date: cert.expiry_date ? cert.expiry_date.split('T')[0] : ''
    });
  };

  const deleteCertificate = (id, name) => {
    if (!window.confirm(`Delete certificate "${name}"? This cannot be undone.`)) return;
    axios.delete(`/api/certificates/delete/${id}`, config)
      .then(() => {
        showMessage('Certificate deleted');
        fetchCertificates();
      })
      .catch(err => {
        console.error(err);
        showMessage('Error deleting certificate', 'error');
      });
  };

  // ---------- STATUS LOGIC (the 30-day rule) ----------
  const getStatus = (days) => {
    if (days === null || days === undefined) return 'unknown';
    if (days < 0) return 'expired';
    if (days <= 30) return 'expiring';
    return 'valid';
  };

  const statusInfo = {
    valid:    { label: 'Valid',         bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    expiring: { label: 'Expiring Soon', bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    expired:  { label: 'Expired',       bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
    unknown:  { label: 'Unknown',       bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
  };

  const counts = {
    valid:    certificates.filter(c => getStatus(c.days_remaining) === 'valid').length,
    expiring: certificates.filter(c => getStatus(c.days_remaining) === 'expiring').length,
    expired:  certificates.filter(c => getStatus(c.days_remaining) === 'expired').length
  };

  const filtered = filterStatus === 'all'
    ? certificates
    : certificates.filter(c => getStatus(c.days_remaining) === filterStatus);

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString();
    } catch {
      return val;
    }
  };

  const dayLabel = (days) => {
    if (days === null || days === undefined) return '—';
    if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Expires today';
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  };

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

  const btnPrimary = {
    padding: '12px 22px',
    borderRadius: '8px',
    border: 'none',
    background: '#0f172a',
    color: 'white',
    fontWeight: '800',
    fontSize: '0.85rem',
    cursor: 'pointer'
  };

  const btnGhost = {
    padding: '12px 22px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontWeight: '800',
    fontSize: '0.85rem',
    cursor: 'pointer'
  };

  const btnSmall = {
    padding: '7px 12px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '700',
    fontSize: '0.75rem',
    cursor: 'pointer',
    marginRight: '6px'
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

      {/* HEADER ROW */}
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
            Certificate Tracker
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Monitor employee certifications and their expiry dates
          </p>
        </div>
        <button
          onClick={() => {
            if (showAddForm && !editingId) resetForm();
            else { resetForm(); setShowAddForm(true); }
          }}
          style={btnPrimary}
        >
          {showAddForm && !editingId ? '✕ Close' : '+ Add Certificate'}
        </button>
      </div>

      {/* 30-DAY WARNING BANNER */}
      {counts.expiring > 0 && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 22px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <span style={{ fontSize: '1.8rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '900', color: '#92400e', fontSize: '1rem', marginBottom: '2px' }}>
              30-Day Expiry Warning
            </div>
            <div style={{ color: '#78350f', fontSize: '0.9rem' }}>
              <strong>{counts.expiring}</strong> certificate{counts.expiring === 1 ? ' is' : 's are'} expiring within the next 30 days. Please arrange renewals.
            </div>
          </div>
        </div>
      )}

      {/* EXPIRED BANNER */}
      {counts.expired > 0 && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #dc2626',
          borderRadius: '12px',
          padding: '16px 22px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <span style={{ fontSize: '1.8rem' }}>🚫</span>
          <div>
            <div style={{ fontWeight: '900', color: '#991b1b', fontSize: '1rem', marginBottom: '2px' }}>
              Expired Certificates
            </div>
            <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>
              <strong>{counts.expired}</strong> certificate{counts.expired === 1 ? ' has' : 's have'} already expired and must be renewed immediately.
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <SummaryCard
          label="Total"
          value={certificates.length}
          bg="#f1f5f9"
          color="#0f172a"
          icon="🎓"
        />
        <SummaryCard
          label="Valid"
          value={counts.valid}
          bg="#dcfce7"
          color="#15803d"
          icon="✅"
        />
        <SummaryCard
          label="Expiring (≤30d)"
          value={counts.expiring}
          bg="#fef3c7"
          color="#b45309"
          icon="⚠️"
        />
        <SummaryCard
          label="Expired"
          value={counts.expired}
          bg="#fee2e2"
          color="#b91c1c"
          icon="🚫"
        />
      </div>

      {/* ADD / EDIT FORM */}
      {showAddForm && (
        <div style={card}>
          <h3 style={{ margin: '0 0 18px 0', color: '#0f172a', fontSize: '1.1rem' }}>
            {editingId ? '✎ Edit Certificate' : '+ Add New Certificate'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={label}>Employee</label>
                <select
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  style={input}
                  required
                  disabled={!!editingId}
                >
                  <option value="">Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.userName} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Certificate Name</label>
                <input
                  name="certificate_name"
                  value={form.certificate_name}
                  onChange={handleChange}
                  style={input}
                  placeholder="e.g. First Aid Level 2"
                  required
                />
              </div>
              <div>
                <label style={label}>Issue Date</label>
                <input
                  type="date"
                  name="issue_date"
                  value={form.issue_date}
                  onChange={handleChange}
                  style={input}
                />
              </div>
              <div>
                <label style={label}>Expiry Date</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={form.expiry_date}
                  onChange={handleChange}
                  style={input}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={btnPrimary}>
                {editingId ? 'Save Changes' : 'Add Certificate'}
              </button>
              <button type="button" onClick={resetForm} style={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER */}
      {certificates.length > 0 && (
        <div style={{ ...card, padding: '16px 20px' }}>
          <label style={{ ...label, marginBottom: '8px' }}>Filter by status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ ...input, maxWidth: '300px' }}
          >
            <option value="all">All certificates</option>
            <option value="valid">✅ Valid only</option>
            <option value="expiring">⚠️ Expiring within 30 days</option>
            <option value="expired">🚫 Expired only</option>
          </select>
        </div>
      )}

      {/* CERTIFICATES TABLE */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading certificates...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎓</div>
            <p style={{ margin: 0 }}>
              {certificates.length === 0
                ? <>No certificates yet. Click <strong>+ Add Certificate</strong> to begin.</>
                : 'No certificates match this filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={th}>Employee</th>
                  <th style={th}>Certificate</th>
                  <th style={th}>Issued</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Time Remaining</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert, i) => {
                  const status = getStatus(cert.days_remaining);
                  const info = statusInfo[status];
                  return (
                    <tr key={cert.id} style={{
                      backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <td style={{ ...td, fontWeight: '700', color: '#0f172a' }}>
                        {cert.employee_name || `#${cert.employee_id}`}
                      </td>
                      <td style={{ ...td, fontWeight: '600', color: '#0f172a' }}>
                        {cert.certificate_name}
                      </td>
                      <td style={{ ...td, color: '#64748b', fontSize: '0.82rem' }}>
                        {formatDate(cert.issue_date)}
                      </td>
                      <td style={{ ...td, fontWeight: '700', color: '#0f172a' }}>
                        {formatDate(cert.expiry_date)}
                      </td>
                      <td style={{ ...td, color: info.color, fontWeight: '700', fontSize: '0.82rem' }}>
                        {dayLabel(cert.days_remaining)}
                      </td>
                      <td style={td}>
                        <span style={{
                          backgroundColor: info.bg,
                          color: info.color,
                          padding: '4px 12px',
                          borderRadius: '50px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          border: `1px solid ${info.border}`
                        }}>
                          {info.label}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => startEdit(cert)}
                          style={{ ...btnSmall, background: '#0f172a', color: 'white' }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => deleteCertificate(cert.id, cert.certificate_name)}
                          style={{ ...btnSmall, background: '#fee2e2', color: '#b91c1c' }}
                        >
                          🗑 Delete
                        </button>
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

const SummaryCard = ({ label, value, bg, color, icon }) => (
  <div style={{
    backgroundColor: bg,
    borderRadius: '12px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    border: '1px solid rgba(0,0,0,0.05)'
  }}>
    <span style={{ fontSize: '1.6rem' }}>{icon}</span>
    <div>
      <div style={{
        fontSize: '0.7rem',
        fontWeight: '800',
        color: color,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: '900', color: color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  </div>
);

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
  fontSize: '0.85rem'
};

export default CertificateTracker;